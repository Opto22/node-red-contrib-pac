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

import * as NodeRed from '../../submodules/opto22-node-red-common/typings/nodered';
import * as ConfigHandler from "../config-handler";
import * as ErrorHanding from "../error-handling";
import { NodeBaseConfiguration, FunctionNodeBaseImpl, PromiseResponse } from './base-node';

var RED: NodeRed.RED;

export function setRED(globalRED: NodeRed.RED)
{
    RED = globalRED;
}

interface NodeWriteConfiguration extends NodeBaseConfiguration
{
    value: string;
    valueType: string; // 'msg', 'msg.payload', or 'value';
}



/** Function pointer definition for Writing One Variable. */
interface WriteOneVarFunc
{
    (ioName: string, valueObj: { value: any }): Promise<{
        response: http.ClientResponse;
        body?: any;
    }>;
}

/** Function pointer definition for Writing One Variable. */
interface WriteOneTableFunc
{
    (ioName: string, valueObj: any[]): Promise<{
        response: http.ClientResponse;
        body?: any;
    }>;
}

/**
 * The implementation class for the SNAP PAC Write nodes.
 */
export class PacWriteNodeImpl extends FunctionNodeBaseImpl
{
    private nodeWriteConfig: NodeWriteConfiguration
    static activeMessageCount: number = 0;

    constructor(nodeConfig: NodeWriteConfiguration, deviceConfig: ConfigHandler.DeviceConfiguration, node: NodeRed.Node)
    {
        super(nodeConfig, deviceConfig, node);
        this.nodeWriteConfig = nodeConfig;
    }

    // Handler for 'close' events from Node-RED.
    public onClose()
    {
        // When the node is deleted, reset the status. This will clear out any error details or pending
        // operations.
        this.node.status({});
    }

    // Handler for 'input' events from Node-RED.
    public onInput(msg: any): void
    {
        PacWriteNodeImpl.activeMessageCount++;

        if (this.previousResponseError) {
            this.node.status({
                fill: "red", shape: "dot",
                text: "writing [" + this.previousResponseError.nodeShortErrorMsg + "]"
            });
        }
        else {
            this.node.status({ fill: "green", shape: "dot", text: "writing" });
        }

        var promise: Promise<PromiseResponse>;

        // Any values in the msg override what's configured in the node.
        this.checkMsgOverrides(msg, this.nodeConfig);
        try {
            var valueObject = null;

            var nodeWriteConfig = this.nodeWriteConfig;

            switch (nodeWriteConfig.valueType) {
                case 'msg':
                case 'msg.payload':

                    var msgProperty: string;

                    if (nodeWriteConfig.valueType === 'msg.payload') {
                        msgProperty = 'payload';
                    } else {
                        msgProperty = nodeWriteConfig.value;
                    }

                    // Get the value out of the message.
                    var msgValue = RED.util.getMessageProperty(msg, msgProperty);

                    // Confirm that we got something out of the message.
                    if (msgValue === undefined) {
                        throw new Error('msg.' + msgProperty + ' is undefined.');
                    }

                    // Try to get a value out and into the right format for the controller's tag.
                    valueObject = PacWriteNodeImpl.writeValueToWriteObject(nodeWriteConfig.dataType, msgValue);

                    break;
                case 'value':
                    // We have a string from the UI and need to figure it out.
                    valueObject = PacWriteNodeImpl.stringValueToWriteObject(nodeWriteConfig.dataType, nodeWriteConfig.value);
                    break;
                default:
                    throw new Error('Unexpected value type - ' + nodeWriteConfig.valueType);
            }
        }
        catch (e) {
            var errorMessage: string;
            if (e instanceof Error)
                errorMessage = (<Error>e).message;
            else
                errorMessage = JSON.stringify(e);

            this.node.error(errorMessage, msg);
            this.node.status({ fill: "red", shape: "dot", text: "error" });
            this.ctrlQueue.done(0);
            return;
        }

        promise = this.getWritePromise(valueObject);

        if (!promise) {
            this.node.status({ fill: "red", shape: "dot", text: "error" });
            return;
        }

        promise.then(
            // onFullfilled handler
            (fullfilledResponse: PromiseResponse) =>
            {
                PacWriteNodeImpl.activeMessageCount--;

                this.previousResponseError = undefined;

                this.node.status({});
                msg.body = fullfilledResponse.body;
                this.node.send(msg);
                var queueLength = this.ctrlQueue.done(0);
                this.updateQueuedStatus(queueLength);
            },
            // onRejected handler
            (error: any) =>
            {
                PacWriteNodeImpl.activeMessageCount--;

                this.previousResponseError = ErrorHanding.handleErrorResponse(error, msg, this.node,
                    this.previousResponseError);

                this.ctrlQueue.done(50);
            }
        );
    }

    static writeValueToWriteObject(dataType: string, msgValue: any): any
    {
        var valueObject = null;

        // Try to get a value out and into the right format for the controller's tag.
        if (typeof msgValue === 'string') {
            valueObject = PacWriteNodeImpl.stringValueToWriteObject(dataType, msgValue);
        }
        else if (typeof msgValue === 'number') {
            valueObject = PacWriteNodeImpl.numberValueToWriteObject(dataType, msgValue);
        }
        else if (typeof msgValue === 'boolean') {
            valueObject = PacWriteNodeImpl.booleanValueToWriteObject(dataType, msgValue);
        }
        else if (typeof msgValue === 'object') {
            if (Array.isArray(msgValue)) {
                valueObject = PacWriteNodeImpl.arrayValueToWriteObject(dataType, msgValue);
            }
            else if (msgValue === null) {
                // For now, at least, don't accept any nulls as a value to write.
                throw new Error('"null" is not a valid value.');
            }
            else {
                valueObject = PacWriteNodeImpl.arrayValueToWriteObject(dataType, msgValue);
            }
        }

        if (valueObject === null) {

            // Just take whatever the user gives us. The PAC REST API will
            // decide what to do with it.
            if (dataType.indexOf('table') >= 0) {
                // Table writes expect an array. It doesn't need to be wrapped.
                valueObject = msgValue;
            } else {
                // Wrap the value into an object.
                valueObject = { value: msgValue };
            }
        }
        return valueObject;
    }

    // Static so that it's easily testable.
    static stringValueToWriteObject(dataType: string, value: any): any
    {
        // Make sure we only have a string. If we get here, it's probably our own fault.
        if (typeof value !== 'string')
            throw new Error('Invalid Input');

        var writeObj: any = null;

        switch (dataType) {
            case 'dig-output':
                var result = false;

                // For digital outputs, we don't want to go with the standard JavaScript string-to-boolean rules.
                // We also want to support 'off' and '0' string values as being false.
                var testValue = value.toLowerCase().trim();
                if ((testValue === 'off') || (testValue === 'false') || (testValue === '0'))
                    result = false;
                else if ((testValue === 'on') || (testValue === 'true') || (testValue === '-1') || (testValue === '1'))
                    result = true;
                else
                    throw new Error('"' + value + '" is not a valid value for a digital output.');

                writeObj = { value: result };

                break;
            case 'ana-output':
            case 'int32-variable':
            case 'int64-variable':
            case 'float-variable':
                var valueTrimmed = value.trim();

                if (valueTrimmed === '') {
                    throw new Error('"' + value + '" is not a valid number.');
                }

                var valueAsNumber = Number(valueTrimmed);

                if (isNaN(valueAsNumber)) {
                    throw new Error('"' + value + '" is not a valid number.');
                } else {
                    if (dataType === 'int64-variable') {
                        // Keep it as a string, but clean it up a bit.
                        var valueFinal = value.trim();
                        if (valueFinal === '') {
                            valueFinal = '0';
                        }

                        writeObj = { value: valueFinal };
                    }
                    else {
                        writeObj = { value: valueAsNumber };
                    }
                }
                break;

            case 'string-variable':
                writeObj = { value: value };
                break;
            case 'int32-table':
            case 'int64-table':
            case 'float-table':
            case 'string-table':

                // Use JSON.parse() to convert from a string to an array.

                var trimmedValue = value.trim();
                if (trimmedValue === '') {
                    writeObj = [];
                }
                else {
                    // Add the square-brackets, if needed.
                    if (trimmedValue[0] !== '[') {
                        trimmedValue = '[' + trimmedValue;
                    }
                    if (trimmedValue[trimmedValue.length - 1] !== ']') {
                        trimmedValue = trimmedValue + ']';;
                    }

                    writeObj = JSON.parse(trimmedValue);
                }

                break;
        }

        return writeObj;
    }

    // Static so that it's easily testable.
    static booleanValueToWriteObject(dataType: string, value: any): any
    {
        // Make sure we only have a string. If we get here, it's probably our own fault.
        if (typeof value !== 'boolean')
            throw new Error('Invalid Input');

        var writeObj: any = null;

        switch (dataType) {
            case 'dig-output':
                writeObj = { value: value };
                break;
            case 'ana-output':
            case 'int32-variable':
            case 'float-variable':
                writeObj = { value: Number(value) };
                break;
            case 'int64-variable':
                writeObj = { value: String(Number(value)) };
                break;
            case 'int32-table':
            case 'float-table':
                writeObj = [Number(value)];
                break;
            case 'int64-table':
                writeObj = [String(Number(value))];
                break;
            case 'string-variable':
                writeObj = { value: String(value) };
                break;
            case 'string-table':
                writeObj = [String(value)];
                break;
        }

        return writeObj;
    }

    // Static so that it's easily testable.
    static numberValueToWriteObject(dataType: string, value: any): any
    {
        // Make sure we only have a string. If we get here, it's probably our own fault.
        if (typeof value !== 'number')
            throw new Error('Invalid Input');

        var writeObj: any = null;

        switch (dataType) {
            case 'dig-output':
                writeObj = { value: Boolean(value) };
                break;
            case 'int64-variable':
                writeObj = { value: String(value) };
                break;
            case 'int32-table':
            case 'float-table':
                writeObj = [value];
                break;
            case 'int64-table':
                writeObj = [String(value)];
                break;
            case 'string-variable':
                writeObj = { value: String(value) };
                break;
            case 'string-table':
                writeObj = [String(value)];
                break;
        }

        return writeObj;
    }

    static arrayValueToWriteObject(dataType: string, value: any): any
    {
        // Make sure we only have a string. If we get here, it's probably our own fault.
        if (!Array.isArray(value))
            throw new Error('Invalid Input');

        var writeObj: any = null;

        switch (dataType) {
            case 'ana-output':
                throw new Error('An array is not a valid value for an analog output.');
            case 'dig-output':
                throw new Error('An array is not a valid value for a digital output.');
            case 'int32-variable':
            case 'int64-variable':
            case 'float-variable':
            case 'string-variable':
                throw new Error('An array is not a valid value for a variable.');
            case 'int32-table':
            case 'float-table':
            case 'int64-table':
            case 'string-table':
                writeObj = value;
                break;
        }

        return writeObj;
    }

    /* Returns a promise for the given controller and node configuration.
     * Basically maps the different options to the specific method.
     */
    private getWritePromise(valueObject: any): Promise<PromiseResponse>
    {
        var nodeConfig = this.nodeConfig;
        var ctrl = this.ctrl;

        // Map the node's data type to the API path.
        switch (nodeConfig.dataType) {
            case 'int32-variable':
                return this.createVariableWritePromise(ctrl.writeInt32Var, valueObject);
            case 'int64-variable':
                return this.createVariableWritePromise(ctrl.writeInt64VarAsString, valueObject);
            case 'float-variable':
                return this.createVariableWritePromise(ctrl.writeFloatVar, valueObject);
            case 'string-variable':
                return this.createVariableWritePromise(ctrl.writeStringVar, valueObject);
            case 'ana-output':
                return this.createVariableWritePromise(ctrl.writeAnalogOutputEu, valueObject);
            case 'dig-output':
                return this.createVariableWritePromise(ctrl.writeDigitalOutputState, valueObject);
            case 'int32-table':
                return this.createTableWritePromise(ctrl.writeInt32Table, valueObject);
            case 'int64-table':
                return this.createTableWritePromise(ctrl.writeInt64Table, valueObject);
            case 'float-table':
                return this.createTableWritePromise(ctrl.writeFloatTable, valueObject);
            case 'string-table':
                return this.createTableWritePromise(ctrl.writeStringTable, valueObject);
        }

        return null;
    }


    private createVariableWritePromise(writeOneFunc: WriteOneVarFunc, value: { value: any })
    {
        var promise: Promise<PromiseResponse>;

        promise = writeOneFunc.call(this.ctrl, this.nodeConfig.tagName, value);

        return promise;
    }

    // Creates a Promise for the Table writes.
    private createTableWritePromise(writeOneTableFunc: WriteOneTableFunc, value: Array<any>)
    {
        var promise: Promise<PromiseResponse>;

        // Parse the start index. We can't assume it's a number.
        var tableStartIndex = parseInt(this.nodeConfig.tableStartIndex);

        // Make sure we have a number.
        if (isNaN(tableStartIndex))
            tableStartIndex = null;

        // Call the appropriate "version" of the function.
        // We can't just pass null objects for these functions.
        // The parameters need to be undefined for the function to work correctly.
        if (tableStartIndex == null)
            promise = writeOneTableFunc.call(this.ctrl, this.nodeConfig.tagName, value);
        else {
            promise = writeOneTableFunc.call(this.ctrl, this.nodeConfig.tagName, value, tableStartIndex);
        }

        return promise;
    }
}

export function createSnapPacWriteNode(nodeConfig: NodeWriteConfiguration)
{
    RED.nodes.createNode(this, nodeConfig);
    var deviceConfig: ConfigHandler.DeviceConfiguration =
        <ConfigHandler.DeviceConfiguration><any>RED.nodes.getNode(nodeConfig.device);
    var node: NodeRed.Node = <NodeRed.Node>this; // for easier reference

    // Create the implementation class.
    var impl = new PacWriteNodeImpl(nodeConfig, deviceConfig, node);

    node.on('close', () =>
    {
        impl.onClose();
    });

    node.on('input', (msg: any) =>
    {
        impl.addMsg(msg);
    });
}

