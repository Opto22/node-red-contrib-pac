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
import { NodeBaseConfiguration, PacNodeBaseImpl, PromiseResponse } from './base-node';


var RED: NodeRed.RED;

export function setRED(globalRED: NodeRed.RED)
{
    RED = globalRED;
}

interface NodeReadConfiguration extends NodeBaseConfiguration
{
    value: string;
    valueType: string; // 'msg' or 'msg.payload'
    topic: string;
    topicType: string; // 'none', 'auto', or 'user'
}


/** Function pointer definition for Reading All Variables. */
interface ReadAllVarsFunc 
{
    (): Promise<{
        response: http.ClientResponse;
        body: Array<any>;
    }>;
}

/** Function pointer definition for Reading One Variable. */
interface ReadOneVarFunc
{
    (ioName: string): Promise<{
        response: http.ClientResponse;
        body: any;
    }>;
}

/** Function pointer definition for Reading All Tables. */
interface ReadAllTablesFunc
{
    (): Promise<{
        response: http.ClientResponse;
        body: Array<any>;
    }>;
}

/** Function pointer for Reading One Table. */
interface ReadOneTableFunc
{
    (tableName: string, startIndex?: number, numElements?: number): Promise<{
        response: http.ClientResponse;
        body: Array<any>;
    }>
}

/**
 * The implementation class for the SNAP PAC Read nodes.
 */
export class PacReadNodeImpl extends PacNodeBaseImpl
{
    private nodeReadConfig: NodeReadConfiguration

    constructor(nodeConfig: NodeReadConfiguration, deviceConfig: ConfigHandler.DeviceConfiguration, node: NodeRed.Node)
    {
        super(nodeConfig, deviceConfig, node);
        this.nodeReadConfig = nodeConfig;
    }

    // Handler for 'close' events from Node-RED.
    public onClose()
    {
        // When the node is deleted, reset the status. This will clear out any error details or pending
        // operations.
        this.node.status({});
    }

    // Handler for 'input' events from Node-RED.
    public onInput(msg: any)
    {
        if (this.previousResponseError) {
            this.node.status({
                fill: "red", shape: "dot",
                text: "reading [" + this.previousResponseError.nodeShortErrorMsg + "]"
            });
        }
        else {
            this.node.status({ fill: "green", shape: "dot", text: "reading" });
        }

        var promise: Promise<PromiseResponse>;

        promise = this.getReadPromise(msg);


        if (!promise) {
            this.node.status({ fill: "red", shape: "dot", text: "error" });
            return;
        }

        promise.then(
            // onFullfilled handler
            (fullfilledResponse: PromiseResponse) =>
            {
                this.previousResponseError = undefined;

                this.node.status({});

                // Always attach the response's body to msg.
                msg.body = fullfilledResponse.body;

                this.setValue(msg, fullfilledResponse);
                this.setTopic(msg);

                this.node.send(msg)
                var queueLength = this.ctrlQueue.done(0);
                this.updateQueuedStatus(queueLength);
            },
            // onRejected handler
            (error: any) =>
            {
                this.previousResponseError = ErrorHanding.handleErrorResponse(error, msg, this.node,
                    this.previousResponseError);

                this.ctrlQueue.done(50);
            }
        );
    }

    private setValue(msg: any, fullfilledResponse: any) 
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

        // See where the value should be placed.
        // valueType was added in v1.0.1, so will not exist on 1.0.0 nodes.
        var valueType = this.nodeReadConfig.valueType === undefined ?
            'msg.payload' : this.nodeReadConfig.valueType;
        switch (valueType) {
            case 'msg':
                RED.util.setMessageProperty(msg, this.nodeReadConfig.value, newValue, true);;
                break;
            case 'msg.payload':
                msg.payload = newValue;
                break;
            default:
                throw new Error('Unexpected value type - ' + valueType);
        }
    }

    private setTopic(msg: any)
    {
        // topicType was added in v1.0.1, so will not exist on 1.0.0 nodes. Use 'none' for default.
        var topicType = this.nodeReadConfig.topicType === undefined ?
            'none' : this.nodeReadConfig.topicType;

        switch (topicType) {
            case 'none':
                break;
            case 'auto':
                msg.topic = 'TODO auto topic';
                break;
            case 'user':
                msg.topic = this.nodeReadConfig.topic;
                break;
            default:
                throw new Error('Unexpected topic type - ' + topicType);
        }
    }

    /**
     * Returns a promise for the given controller and node configuration.
     * Basically maps the different options to the specific method.
     */
    private getReadPromise(msg: any): Promise<PromiseResponse>
    {
        var nodeConfig = this.nodeConfig;
        var ctrl = this.ctrl;

        // Any values in the msg override what's configured in the node.
        this.checkMsgOverrides(msg, nodeConfig);

        // Map the node's data type to the API path.
        switch (nodeConfig.dataType) {
            case 'device-info':
                return ctrl.readDeviceDetails();
            case 'strategy-info':
                return ctrl.readStrategyDetails();
            case 'dig-input':
                return this.createVariableReadPromise(ctrl.readDigitalInputs, ctrl.readDigitalInputState);
            case 'dig-output':
                return this.createVariableReadPromise(ctrl.readDigitalOutputs, ctrl.readDigitalOutputState);
            case 'ana-input':
                return this.createVariableReadPromise(ctrl.readAnalogInputs, ctrl.readAnalogInputEu);
            case 'ana-output':
                return this.createVariableReadPromise(ctrl.readAnalogOutputs, ctrl.readAnalogOutputEu);
            case 'int32-variable':
                return this.createVariableReadPromise(ctrl.readInt32Vars, ctrl.readInt32Var);
            case 'int64-variable':
                return this.createVariableReadPromise(ctrl.readInt64VarsAsStrings, ctrl.readInt64VarAsString);
            case 'float-variable':
                return this.createVariableReadPromise(ctrl.readFloatVars, ctrl.readFloatVar);
            case 'string-variable':
                return this.createVariableReadPromise(ctrl.readStringVars, ctrl.readStringVar);
            case 'down-timer-variable':
                return this.createVariableReadPromise(ctrl.readDownTimerVars, ctrl.readDownTimerValue);
            case 'up-timer-variable':
                return this.createVariableReadPromise(ctrl.readUpTimerVars, ctrl.readUpTimerValue);
            case 'int32-table':
                return this.createTableReadPromise(ctrl.readInt32Tables, ctrl.readInt32Table);
            case 'int64-table':
                return this.createTableReadPromise(ctrl.readInt64Tables, ctrl.readInt64TableAsString);
            case 'float-table':
                return this.createTableReadPromise(ctrl.readFloatTables, ctrl.readFloatTable);
            case 'string-table':
                return this.createTableReadPromise(ctrl.readStringTables, ctrl.readStringTable);
        }

        return null;
    }


    private createVariableReadPromise(readAllFunc: ReadAllVarsFunc, readOneFunc: ReadOneVarFunc)
    {
        var promise: Promise<PromiseResponse>;

        if (this.nodeConfig.tagName == '') {
            promise = readAllFunc.call(this.ctrl);
        }
        else {
            promise = readOneFunc.call(this.ctrl, this.nodeConfig.tagName);
        }

        return promise;
    }

    // Creates a Promise for the Table reads.
    private createTableReadPromise(readAllTablesFunc: ReadAllTablesFunc, readOneTableFunc: ReadOneTableFunc)
    {

        var promise: Promise<PromiseResponse>;

        if (this.nodeConfig.tagName == '') {
            promise = readAllTablesFunc.call(this.ctrl);
        }
        else {

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
        }

        return promise;
    }
}



export function createSnapPacReadNode(nodeConfig: NodeReadConfiguration)
{
    RED.nodes.createNode(this, nodeConfig);
    var deviceConfig: ConfigHandler.DeviceConfiguration =
        <ConfigHandler.DeviceConfiguration><any>RED.nodes.getNode(nodeConfig.device);
    var node: NodeRed.Node = <NodeRed.Node>this; // for easier reference

    // Create the implementation class.
    var impl = new PacReadNodeImpl(nodeConfig, deviceConfig, node);

    this.on('close', () => 
    {
        impl.onClose();
    });

    node.on('input', (msg: any) =>
    {
        impl.addMsg(msg);
    });
}
