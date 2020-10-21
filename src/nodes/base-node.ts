/*
   Copyright 2016-2002 Opto 22

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

import * as MessageQueue from 'opto22-node-red-common/lib/MessageQueue';
import * as NodeRed from 'opto22-node-red-common/typings/nodered';
import * as ApiExLib from "../api-ex";
import * as ConfigHandler from "../config-handler";
import * as ErrorHanding from "../error-handling";

export interface PromiseResponse
{
    response: http.ClientResponse;
    body: any; // Since we don't do anything much with the response bodies, we can ignore the type.
}


// This interface should match the "defaults" field in the Node HTML file.
// There's no way to directly connect the two.
export interface NodeBaseConfiguration
{
    device: string;
    dataType: string;
    tagName: string;
    tableStartIndex: string;
    tableLength: string;
    name: string;
}


/**
 * Base class for SNAP PAC nodes.
 */
export abstract class PacNodeBaseImpl
{
    // The controller connection. 
    protected ctrl: ApiExLib.ControllerApiEx;

    // Message queue to help throttle messages going to the controller.
    protected ctrlQueue: MessageQueue.default;

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
            // if (queueLength < 0) {
            //     this.node.warn('Message rejected. Queue is full for controller.');
            // }

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
        if (queueLength != 0) {
            if (this.previousResponseError) {
                // If there's an existing error, make sure we combine the status and messages.
                this.node.status({
                    fill: "red", shape: "ring",
                    text: "queued [" + this.previousResponseError.nodeShortErrorMsg + "]"
                });
            }
            else {
                this.node.status({ fill: "green", shape: "ring", text: 'queued' });
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
