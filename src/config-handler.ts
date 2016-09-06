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

import * as ApiLib from "./api";
import * as ApiExLib from "./api-ex";
import MessageQueue from "./message-queue";

import http = require('http');
import https = require('https');
import fs = require('fs');
import events = require('events');
import request = require('request');
import NodeRed = require('node-red');

var RED: NodeRed.RED;

export function setRED(globalRED: NodeRed.RED)
{
    RED = globalRED;
}

/**
 * Data structure matching what comes from Node-RED for the PAC's configuration via the user interface.
 */
export interface DeviceCredentials
{
    key: string;
    secret: string;
    publicCertPath: string;
    caCertPath: string;
}

/**
 * Data structure matching what comes from Node-RED for the PAC's configuration via the user interface.
 */
export interface DeviceConfiguration
{
    id: string;
    address: string;
    credentials: DeviceCredentials;
}

/**
 * Called by Node-RED to create a 'pac-device' node.
 */
export function createSnapPacDeviceNode(config: any)
{
    // Create the node. This will also return the credential information attached to 'this'.
    RED.nodes.createNode(this, config);

    var address = config.address;
    var protocol = config.protocol.toLowerCase();
    var useHttps = protocol !== 'http'; // default to HTTPS unless HTTP is specified.

    var key = this.credentials.key;
    var secret = this.credentials.secret;
    var publicCertPath = this.credentials.publicCertPath;
    var caCertPath = this.credentials.caCertPath;

    // Make sure we have values and that they're clean enough to continue.
    key = key ? key : '';
    secret = secret ? secret : '';
    publicCertPath = publicCertPath ? publicCertPath.trim() : '';
    caCertPath = caCertPath ? caCertPath.trim() : '';

    var publicCertFile: Buffer;
    var caCertFile: Buffer;

    if (key === '' || secret === '') {
        RED.log.error('Missing API key for ' + address);
    }

    if (useHttps) {
        if (caCertPath.length === 0) {
            RED.log.error('Missing SSL CA certificate for ' + address);
        }

        try {
            if (publicCertPath && publicCertPath.length > 0) {
                publicCertFile = fs.readFileSync(publicCertPath);
            }

            if (caCertPath && caCertPath.length > 0) {
                caCertFile = fs.readFileSync(caCertPath);
            }
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                RED.log.error('Cannot open certifcate file at \'' + err.path + '\'.');
            }
            else if (err.code === 'EACCES') {
                RED.log.error('Cannot open certifcate file at \'' + err.path + '\' due to file permissions.');
            }
            else {
                RED.log.error(err);
            }
        }
    }

    var ctrl = controllerConnections.createControllerConnection(address, useHttps, key, secret, publicCertFile, caCertFile, config.id);

    this.on('close', () =>
    {
        ctrl.queue.dump(); // dump all but the current in-progress message for this connection.
    });
}

// Holder for controller connections and message queues.
class ControllerConnection 
{
    public ctrl: ApiExLib.ControllerApiEx;
    public queue: MessageQueue;

    constructor(ctrl: ApiExLib.ControllerApiEx, queue: MessageQueue)
    {
        this.ctrl = ctrl;
        this.queue = queue;
    }
}

export class ControllerConnections
{
    private controllerCache: ControllerConnection[] = [];

    public createControllerConnection(address: string, useHttps: boolean, key: string, secret: string, publicCertFile: Buffer, caCertFile: Buffer, id: string): ControllerConnection
    {
        var scheme = useHttps ? 'https' : 'http';
        var fullAddress = scheme + '://' + address + '/api/v1';

        // Create the connection to the controller.
        var ctrl = new ApiExLib.ControllerApiEx(key, secret, fullAddress, useHttps, publicCertFile, caCertFile);

        // Cache it, using the Configuration node's id property.
        this.controllerCache[id] = new ControllerConnection(ctrl, new MessageQueue(500));

        return this.controllerCache[id];
    }

    public getController(id: string): ControllerConnection
    {
        return this.controllerCache[id];
    }

}

// Global cache of controller connections.
export var controllerConnections = new ControllerConnections();