/*
   Copyright 2016-2020 Opto 22

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import http = require('http');

import * as NodeRed from 'opto22-node-red-common/typings/nodered';
import * as ConfigHandler from "../config-handler";
import * as ErrorHanding from "../error-handling";
import { NodeBaseConfiguration, FunctionNodeBaseImpl, PromiseResponse, NodeBaseImpl } from './base-node';
import { InputNodeScanner, InputNodeChangeType } from "../../submodules/opto22-node-red-common/src/InputNodeScanner";


var RED: NodeRed.RED;

export function setRED(globalRED: NodeRed.RED)
{
    RED = globalRED;
}

interface NodeInputConfiguration extends NodeBaseConfiguration
{
    value: string;
    valueType: string; // 'msg' or 'msg.payload'
    sendInitialValue: boolean;
    deadband: string;
    scanTimeSec: string;
    topic: string;
    topicType: string; // 'none', 'auto', or 'user'
}

export interface RequestInfo
{
    promise: Promise<PromiseResponse>
}


/** Function pointer definition for Reading All Variables. */
interface InputAllVarsFunc 
{
    (): Promise<{
        response: http.ClientResponse;
        body: Array<any>;
    }>;
}

/** Function pointer definition for Reading One Variable. */
interface InputOneVarFunc
{
    (ioName: string): Promise<{
        response: http.ClientResponse;
        body: any;
    }>;
}

/** Function pointer definition for Reading All Tables. */
interface InputAllTablesFunc
{
    (): Promise<{
        response: http.ClientResponse;
        body: Array<any>;
    }>;
}

/** Function pointer for Reading One Table. */
interface InputOneTableFunc
{
    (tableName: string, startIndex?: number, numElements?: number): Promise<{
        response: http.ClientResponse;
        body: Array<any>;
    }>
}

/**
 * The implementation class for the SNAP PAC Read nodes.
 */
export class PacInputNodeImpl extends NodeBaseImpl
{
    private nodeInputConfig: NodeInputConfiguration;
    private inputNodeHelper: InputNodeScanner;
    private scanTimeMs: number;
    private requestDelayedTimer: NodeJS.Timer;

    constructor(nodeConfig: NodeInputConfiguration, deviceConfig: ConfigHandler.DeviceConfiguration, node: NodeRed.Node)
    {
        super(nodeConfig, deviceConfig, node);
        this.nodeInputConfig = nodeConfig;

        var deadband: number;
        var nodeChangeType: InputNodeChangeType = InputNodeChangeType.None;

        this.scanTimeMs = parseFloat(nodeConfig.scanTimeSec);
        if (isNaN(this.scanTimeMs))
            this.scanTimeMs = 1000;
        else
            this.scanTimeMs = this.scanTimeMs * 1000.0;

        if ((this.nodeInputConfig.dataType == 'int32-variable') ||
            (this.nodeInputConfig.dataType == 'float-variable') ||
            (this.nodeInputConfig.dataType == 'ana-input') ||
            (this.nodeInputConfig.dataType == 'ana-output') ||
            (this.nodeInputConfig.dataType == 'int32-table') ||
            (this.nodeInputConfig.dataType == 'float-tiable')
        ) {
            nodeChangeType = InputNodeChangeType.Deadband;

            deadband = parseFloat(nodeConfig.deadband);
            if (isNaN(deadband))
                deadband = 1;
        }

        this.inputNodeHelper = new InputNodeScanner(this.scanTimeMs, nodeChangeType, deadband,
            nodeConfig.sendInitialValue, this.onScan);

        // Make sure the device was configured before starting the scan.
        if (this.ctrl) {
            if (this.scanTimeMs > 0) {
                this.inputNodeHelper.startScan();
            }
        }
        else {
            this.node.status({ fill: "red", shape: "dot", text: "No device" });
        }
    }

    // Handler for 'close' events from Node-RED.
    public onClose = () =>
    {
        this.inputNodeHelper.close();

        if (this.requestDelayedTimer) {
            clearTimeout(this.requestDelayedTimer);
        }

        // When the node is deleted, reset the status. This will clear out any error details or pending
        // operations.
        this.node.status({});
    }


    // If a request takes more than a moment, we want to show the user that 
    // it's been delayed. It's very likely that this request or another on the shared HTTP Agent's queue
    // it timing out.
    private scanNotDoneCallback = () =>
    {
        // If there's no current error, update the status to show that the request
        // is delayed. Probably either this or another node on the same device is timing out.
        if (!this.previousResponseError) {
            this.node.status({ fill: "yellow", shape: "dot", text: "scanning (delayed)" });
        }
        this.requestDelayedTimer = null;
    }

    // Callback used by the scanner's timer.
    public onScan = () =>
    {
        // Need to know if it's a SNAP or Groov PAC
        this.ctrl.getDeviceType(this.node, (error: any) =>
        {
            if (error) {
                this.previousResponseError = ErrorHanding.handleErrorResponse(error, {}, this.node,
                    this.previousResponseError);
                return;
            }

            // Start the Request Delayed timeout
            this.requestDelayedTimer = setTimeout(this.scanNotDoneCallback, 3000);

            var reqInfo = this.getReadRequest();

            if (!reqInfo || !reqInfo.promise) {
                this.node.status({ fill: "red", shape: "dot", text: "error" });
                return;
            }

            reqInfo.promise.then(
                // onFullfilled handler
                (fullfilledResponse: PromiseResponse) =>
                {
                    this.previousResponseError = undefined;

                    this.node.status({});

                    // Clear the Request Delayed timeout
                    clearTimeout(this.requestDelayedTimer);
                    this.requestDelayedTimer = null;

                    this.node.status({ fill: "green", shape: "dot", text: "scanning" });
                    this.previousResponseError = undefined;

                    let newValue = this.getValueOutOfResponse(fullfilledResponse);

                    if (this.inputNodeHelper.updateValue(newValue)) {
                        let msg: any = {
                            payload: newValue,
                            body: fullfilledResponse.body,
                            inputType: this.nodeInputConfig.dataType
                            // topic: ????
                        };

                        this.node.send(msg);
                    }
                },
                // onRejected handler
                (error: any) =>
                {
                    // Clear the Request Delayed timeout
                    clearTimeout(this.requestDelayedTimer);
                    this.requestDelayedTimer = null;

                    this.previousResponseError = ErrorHanding.handleErrorResponse(error, {}, this.node,
                        this.previousResponseError);

                    this.inputNodeHelper.updateError();
                }
            );
        });
    }


    // // Handler for 'input' events from Node-RED.
    // public onInput(msg: any)
    // {
    //     if (this.previousResponseError) {
    //         this.node.status({
    //             fill: "red", shape: "dot",
    //             text: "reading [" + this.previousResponseError.nodeShortErrorMsg + "]"
    //         });
    //     }
    //     else {
    //         this.node.status({ fill: "green", shape: "dot", text: "reading" });
    //     }

    //     var promise: Promise<PromiseResponse>;

    //     promise = this.getReadPromise(msg);


    //     if (!promise) {
    //         this.node.status({ fill: "red", shape: "dot", text: "error" });
    //         return;
    //     }

    //     promise.then(
    //         // onFullfilled handler
    //         (fullfilledResponse: PromiseResponse) =>
    //         {
    //             this.previousResponseError = undefined;

    //             this.node.status({});

    //             // Always attach the response's body to msg.
    //             msg.body = fullfilledResponse.body;

    //             this.setValue(msg, fullfilledResponse);
    //             this.setTopic(msg);

    //             this.node.send(msg)
    //             var queueLength = this.ctrlQueue.done(0);
    //             this.updateQueuedStatus(queueLength);
    //         },
    //         // onRejected handler
    //         (error: any) =>
    //         {
    //             this.previousResponseError = ErrorHanding.handleErrorResponse(error, msg, this.node,
    //                 this.previousResponseError);

    //             this.ctrlQueue.done(50);
    //         }
    //     );
    // }

    private getValueOutOfResponse(fullfilledResponse: any): any
    {
        var newValue;

        // See if we can unwrap the value.
        if (typeof fullfilledResponse.body === 'object') {

            // If an array, just use it directly.
            if (Array.isArray(fullfilledResponse.body)) {
                newValue = fullfilledResponse.body;
            }
            else {
                // If there's a 'value' property in the body, then go ahead and unwrap
                // the value in the msg.payload.
                if (fullfilledResponse.body.value !== undefined) {
                    newValue = fullfilledResponse.body.value;
                } else {
                    newValue = fullfilledResponse.body;
                }
            }
        } else {
            // Not an object or array, so just use it directly.
            newValue = fullfilledResponse.body;
        }

        return newValue;
    }

    //     // See where the value should be placed.
    //     // valueType was added in v1.0.1, so will not exist on 1.0.0 nodes.
    //     var valueType = this.NodeInputConfig.valueType === undefined ?
    //         'msg.payload' : this.NodeInputConfig.valueType;
    //     switch (valueType) {
    //         case 'msg':
    //             RED.util.setMessageProperty(msg, this.NodeInputConfig.value, newValue, true);;
    //             break;
    //         case 'msg.payload':
    //             msg.payload = newValue;
    //             break;
    //         default:
    //             throw new Error('Unexpected value type - ' + valueType);
    //     }
    // }

    // private setTopic(msg: any)
    // {
    //     // topicType was added in v1.0.1, so will not exist on 1.0.0 nodes. Use 'none' for default.
    //     var topicType = this.NodeInputConfig.topicType === undefined ?
    //         'none' : this.NodeInputConfig.topicType;

    //     switch (topicType) {
    //         case 'none':
    //             break;
    //         case 'auto':
    //             msg.topic = 'TODO auto topic';
    //             break;
    //         case 'user':
    //             msg.topic = this.NodeInputConfig.topic;
    //             break;
    //         default:
    //             throw new Error('Unexpected topic type - ' + topicType);
    //     }
    // }

    /**
     * Returns a promise for the given controller and node configuration.
     * Basically maps the different options to the specific method.
     */
    private getReadRequest(): RequestInfo
    {
        var nodeConfig = this.nodeConfig;
        var ctrl = this.ctrl;

        // Make sure we have a tag name.
        if (nodeConfig.tagName.trim() == '')
            return;

        // Map the node's data type to the API path.
        switch (nodeConfig.dataType) {
            // case 'device-info':
            //     return ctrl.readDeviceDetails();
            // case 'strategy-info':
            //     return ctrl.readStrategyDetails();
            case 'dig-input':
                return {
                    promise: this.createVariableReadPromise(ctrl.readDigitalInputState)
                }
            case 'dig-output':
                return {
                    promise: this.createVariableReadPromise(ctrl.readDigitalOutputState)
                }
            case 'ana-input':
                return {
                    promise: this.createVariableReadPromise(ctrl.readAnalogInputEu)
                }
            case 'ana-output':
                return {
                    promise: this.createVariableReadPromise(ctrl.readAnalogOutputEu)
                }
            case 'int32-variable':
                return {
                    promise: this.createVariableReadPromise(ctrl.readInt32Var)
                }
            case 'int64-variable':
                return {
                    promise: this.createVariableReadPromise(ctrl.readInt64VarAsString)
                }
            case 'float-variable':
                return {
                    promise: this.createVariableReadPromise(ctrl.readFloatVar)
                }
            case 'string-variable':
                return {
                    promise: this.createVariableReadPromise(ctrl.readStringVar)
                }
            // case 'down-timer-variable':
            //     return this.createVariableReadPromise(ctrl.readDownTimerVars, ctrl.readDownTimerValue);
            // case 'up-timer-variable':
            //     return this.createVariableReadPromise(ctrl.readUpTimerVars, ctrl.readUpTimerValue);
            case 'int32-table':
                return {
                    promise: this.createTableReadPromise(ctrl.readInt32Table)
                }
            case 'int64-table':
                return {
                    promise: this.createTableReadPromise(ctrl.readInt64TableAsString)
                }
            case 'float-table':
                return {
                    promise: this.createTableReadPromise(ctrl.readFloatTable)
                }
            case 'string-table':
                return {
                    promise: this.createTableReadPromise(ctrl.readStringTable)
                }
        }

        return null;
    }


    private createVariableReadPromise(readOneFunc: InputOneVarFunc)
    {
        return readOneFunc.call(this.ctrl, this.nodeConfig.tagName);
    }

    // Creates a Promise for the Table reads.
    private createTableReadPromise(readOneTableFunc: InputOneTableFunc)
    {
        var promise: Promise<PromiseResponse>;

        // Parse the start index and table length. We can't assume that they're numbers.
        var tableStartIndex = parseInt(this.nodeConfig.tableStartIndex);
        var tableLength = parseInt(this.nodeConfig.tableLength);

        // Make sure we have a number.
        if (isNaN(tableStartIndex))
            tableStartIndex = null;
        if (isNaN(tableLength))
            tableLength = null;

        // Call the appropriate "version" of the function.
        // We can't just pass null objects for these functions.
        // The parameters need to be undefined for the function to work correctly.
        if (tableStartIndex == null)
            promise = readOneTableFunc.call(this.ctrl, this.nodeConfig.tagName);
        else {
            if (tableLength == null)
                promise = readOneTableFunc.call(this.ctrl, this.nodeConfig.tagName, tableStartIndex);
            else
                promise = readOneTableFunc.call(this.ctrl, this.nodeConfig.tagName, tableStartIndex, tableLength);
        }

        return promise;
    }
}



export function createSnapPacInputNode(nodeConfig: NodeInputConfiguration)
{
    RED.nodes.createNode(this, nodeConfig);
    var deviceConfig: ConfigHandler.DeviceConfiguration =
        <ConfigHandler.DeviceConfiguration><any>RED.nodes.getNode(nodeConfig.device);
    var node: NodeRed.Node = <NodeRed.Node>this; // for easier reference

    // Create the implementation class.
    var impl = new PacInputNodeImpl(nodeConfig, deviceConfig, node);

    this.on('close', impl.onClose);
}
