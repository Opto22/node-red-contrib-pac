/*
   Copyright 2016 Opto 22

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

// Import our modules
import * as ApiExLib from "./api-ex";
import * as ErrorHanding from "./error-handling";
import * as ConfigHandler from "./config-handler";
import MessageQueue from "./message-queue";

// Import external modules
import http = require('http');
import https = require('https');
import fs = require('fs');
import request = require('request');
import FormData = require('form-data');
import * as NodeRed from 'opto22-node-red-common/typings/nodered';
import Promise = require('bluebird');

var RED: NodeRed.RED;

export function setRED(globalRED: NodeRed.RED)
{
    RED = globalRED;
}


// This interface should match the "defaults" field in the Node HTML file.
// There's no way to directly connect the two.
interface NodeBaseConfiguration
{
    device: string;
    dataType: string;
    tagName: string;
    tableStartIndex: string;
    tableLength: string;
    name: string;
}

interface NodeReadConfiguration extends NodeBaseConfiguration
{
    value: string;
    valueType: string; // 'msg' or 'msg.payload'
    topic: string;
    topicType: string; // 'none', 'auto', or 'user'
}

interface NodeWriteConfiguration extends NodeBaseConfiguration
{
    value: string;
    valueType: string; // 'msg', 'msg.payload', or 'value';
}

interface PromiseResponse
{
    response: http.ClientResponse;
    body: any; // Since we don't do anything much with the response bodies, we can ignore the type.
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
 * Base class for SNAP PAC nodes.
 */
export abstract class PacNodeBaseImpl
{
    // The controller connection. 
    protected ctrl: ApiExLib.ControllerApiEx;

    // Message queue to help throttle messages going to the controller.
    protected ctrlQueue: MessageQueue;

    // The user's node configuration.
    protected nodeConfig: NodeBaseConfiguration;

    // The user's controller device configurations (IP address and HTTPS settings)
    protected deviceConfig: ConfigHandler.DeviceConfiguration;

    // The node object.
    protected node: NodeRed.Node;

    protected previousResponseError: ErrorHanding.ErrorDetails | undefined;

    constructor(nodeConfig: NodeBaseConfiguration, deviceConfig: ConfigHandler.DeviceConfiguration, node: NodeRed.Node)
    {
        this.nodeConfig = nodeConfig;
        this.deviceConfig = deviceConfig;
        this.node = node;

        if (deviceConfig) {
            var controllerConnection = ConfigHandler.controllerConnections.getController(deviceConfig.id);
            this.ctrl = controllerConnection.ctrl;
            this.ctrlQueue = controllerConnection.queue;
        }
        else {
            this.node.error('Missing controller configuration', '');
        }
    }

    public abstract onInput(msg: any): void;

    /** Add message to the queue. */
    public addMsg(msg): void
    {
        // Check that we have a controller connection to use.
        if (!this.ctrl || !this.ctrlQueue) {
            // If there's no controller connection, immediately return and effectively
            // drop the message. An error is logged when the node is downloaded, which mirrors
            // what the official nodes do.
            this.node.status({ fill: "red", shape: "dot", text: 'missing controller configuration' });
            return;
        }
        // Check for basic HTTPS configuration errors. If there are any, then don't even try.
        // Drop the message.
        if (this.ctrl.hasConfigError()) {
            this.node.status({ fill: "red", shape: "dot", text: 'Configuration error' });
            return;
        }

        // Need to know if it's a SNAP or Groov PAC
        this.ctrl.getDeviceType(this.node, (error: any) =>
        {
            if (error) {
                this.previousResponseError = ErrorHanding.handleErrorResponse(error, msg, this.node,
                    this.previousResponseError);
                return;
            }

            // Add the message to the queue.
            var queueLength = this.ctrlQueue.add(msg, this.node, this, this.onInput);

            // See if there's room for the message.
            if (queueLength < 0) {
                this.node.warn('Message rejected. Queue is full for controller.');
            }

            // Update the node's status, but don't overwrite the status if this node is currently
            // being processed.
            var currentMsgBeingProcessed = this.ctrlQueue.getCurrentMessage();
            if (currentMsgBeingProcessed.inputEventObject !== this) {
                if (queueLength !== 0) {
                    this.updateQueuedStatus(queueLength);
                }
            }
        });
    }

    protected updateQueuedStatus(queueLength: number)
    {
        if (this.previousResponseError) {
            // If there's an existing error, make sure we combine the status and messages.
            this.node.status({
                fill: "red", shape: "ring",
                text: "queued [" + this.previousResponseError.nodeShortErrorMsg + "]"
            });
        }
        else {
            if (queueLength >= 1) {
                this.node.status({ fill: "green", shape: "ring", text: queueLength + ' queued' });
            }
            else if (queueLength < 0) {
                this.node.status({ fill: "yellow", shape: "ring", text: "queue full" });
            }
        }
    }

    // The user can provide the tag name and table range as properties
    // in the message. These override anything in the node's configuration.
    protected checkMsgOverrides(msg: any, nodeConfig: NodeBaseConfiguration)
    {
        if (msg.payload !== undefined) {
            // See if msg.payload is an object (but not null, which is also an object.)
            if (typeof msg.payload === 'object' && (msg.payload !== null)) {

                if (msg.payload.tagName !== undefined) {
                    nodeConfig.tagName = msg.payload.tagName;
                }

                if (msg.payload.tableStartIndex !== undefined) {
                    nodeConfig.tableStartIndex = msg.payload.tableStartIndex;
                }

                if (msg.payload.tableLength !== undefined) {
                    nodeConfig.tableLength = msg.payload.tableLength;
                }

            }
        }
    }

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

/**
 * The implementation class for the SNAP PAC Write nodes.
 */
export class PacWriteNodeImpl extends PacNodeBaseImpl
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
