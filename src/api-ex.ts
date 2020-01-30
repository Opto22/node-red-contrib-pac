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
import MessageQueue from "./message-queue";

import http = require('http');
import https = require('https');
import fs = require('fs');
import events = require('events');
import request = require('request');
import * as NodeRed from 'opto22-node-red-common/typings/nodered';

var ControllerApi = ApiLib.AllApi;


const pathForSnap = '/api/v1';
const pathForEpic = '/pac';


// The TypeScript client generated with swagger-codegen does not allow us to add our own
// options to the Request library. However, there is an empty and useless default 
// authentication field which we can override and use it as a general extension point.
class RequestOptionsModifier
{
    constructor(private publicCertFile: Buffer, private caCertFile: Buffer,
        private agent: https.Agent, private https: boolean, private isLocalhost: boolean,
        private testing: boolean)
    {

    }

    applyToRequest(requestOptions: request.Options): void
    {
        if (this.https) {
            // Add the required options. Wish there was a more official way to do this.
            // An alternative is to customize the template used by the swagger-codegen tool.
            // This is good enough for now.

            if (this.publicCertFile) {
                requestOptions.cert = this.publicCertFile;
            }

            if (this.caCertFile) {
                requestOptions.ca = this.caCertFile;
            }

            // Local connections do not require certificates for HTTPS.
            // When testing, ignore HTTPS errors.
            if ((!this.publicCertFile && !this.caCertFile && this.isLocalhost) || this.testing) {
                (<https.ServerOptions>requestOptions).rejectUnauthorized = false;
            }

            requestOptions.port = 443;
        }
        else {
            requestOptions.port = 80;
        }

        requestOptions.forever = true;
        requestOptions.agent = this.agent;
        requestOptions.timeout = 30000;
    }
}

export class ControllerApiEx extends ControllerApi
{
    private isLocalHost: boolean;
    private originalFullAddress: string; // scheme + address ; no path
    private apiKeyId: string;
    private apiKeyValue: string;
    private origApiKeyId: string;
    private origApiKeyValue: string;
    private https: boolean;
    private publicCertFile: Buffer;
    private caCertFile: Buffer;
    private httpAgent: http.Agent; // TODO: do we need to keep this around?
    private event: events.EventEmitter;
    private configError: boolean;
    private testing: boolean;

    private hasDeterminedSystemType: boolean;
    private isTargetSnap: boolean;
    private isTargetEpic: boolean;

    constructor(username: string, password: string, fullAddress: string, address: string, https: boolean,
        publicCertFile: Buffer, caCertFile: Buffer, testing: boolean)
    {
        // Assume that the target is SNAP ("/api/v1"), not EPIC ("/pac").
        super(username, password, fullAddress + pathForSnap);

        this.originalFullAddress = fullAddress;

        this.hasDeterminedSystemType = false;
        this.isTargetSnap = false;
        this.isTargetEpic = false;

        this.apiKeyId = username;
        this.apiKeyValue = password;
        this.origApiKeyId = username;
        this.origApiKeyValue = password;
        this.https = https;
        this.publicCertFile = publicCertFile;
        this.caCertFile = caCertFile;
        this.testing = testing;

        if (address.trim().toLowerCase() === 'localhost') {
            this.isLocalHost = true;
        }

        this.replaceDefaultAuthWithCustomRequestOptions();
    }

    // The TypeScript client generated with swagger-codegen does not allow us to add our own
    // options to the Request library. However, there is an empty and useless default 
    // authentication field which we can override and use it as a general extension point.
    private replaceDefaultAuthWithCustomRequestOptions()
    {
        if (this.https) {
            var httpsAgent = new https.Agent({
                keepAlive: true,
                maxSockets: 1 // might not be needed anymore, since we now use MessageQueue.
            });

            // Cast from the HTTPS to the HTTP agent. The node.d.ts typing file doesn't define
            // https.Agent as being derived from http.Agent.
            this.httpAgent = <http.Agent>httpsAgent;

            // Replace the default authentication handler.
            this.authentications.default = new RequestOptionsModifier(this.publicCertFile, this.caCertFile,
                httpsAgent, this.https, this.isLocalHost, this.testing);
        }
        else {
            var httpAgent = new http.Agent(
                {
                    keepAlive: true,
                    maxSockets: 1 // might not be needed anymore, since we now use MessageQueue.
                });

            this.httpAgent = httpAgent;

            // Replace the default authentication handler.
            this.authentications.default = new RequestOptionsModifier(null, null, httpAgent,
                this.https, this.isLocalHost, this.testing);
        }
    }

    private setToSnap()
    {
        this.basePath = this.originalFullAddress + pathForSnap;
        this.apiKeyId = this.origApiKeyId
        delete this.defaultHeaders.apiKey;
    }

    private setToGroov()
    {
        this.basePath = this.originalFullAddress + pathForEpic;
        this.apiKeyId = 'groov-epic-pac-skip-reqoptions-auth';
        this.defaultHeaders['apiKey'] = this.apiKeyValue;
    }

    /**
     * Determines the type of control engine we're communicating with.
     * First tries the SNAP PAC method, and then Groov EPIC method.
     * Both might fail, since the device may be unreachable.
     * Once determined, the type is cached.
     */
    public getDeviceType(node: NodeRed.Node | undefined, callback: (error?: any) => any)
    {
        if (this.hasDeterminedSystemType) {
            process.nextTick(callback);
        }
        else {
            if (node) {
                node.status({ fill: "green", shape: "ring", text: 'determining device type' });
            }

            this.readDeviceDetails()
                .then((fullfilledResponse: { response: http.ClientResponse, body: any }) =>
                {
                    if (fullfilledResponse.body && fullfilledResponse.body.controllerType) {
                        this.isTargetSnap = true;
                        this.hasDeterminedSystemType = true;

                        callback();
                    }
                    else {
                        // Try the Groov EPIC path
                        this.setToGroov()

                        // See if Groov EPIC works
                        this.readDeviceDetails()
                            .then(
                                (fullfilledResponse: { response: http.ClientResponse, body: any }) =>
                                {
                                    if (fullfilledResponse.body && fullfilledResponse.body.controllerType) {
                                        this.isTargetEpic = true;
                                        this.hasDeterminedSystemType = true;

                                        callback();
                                    }
                                    else {
                                        this.setToSnap();// Reset to default

                                        callback(); // error ?
                                    }
                                })
                            .catch((error: any) =>
                            {
                                this.setToSnap();// Reset to default

                                // Neither worked.
                                callback(error);
                            });
                    }
                })
                .catch((error: any) =>
                {
                    // For certain errors, don't even continue.
                    if (error && (error.code == 'ETIMEDOUT' || error.code == 'ENETUNREACH')) {
                        // We're done. No reason to try again.
                        callback(error);

                        return;
                    }

                    // Try the EPIC path
                    this.setToGroov();

                    // See if Groov EPIC works
                    this.readDeviceDetails()
                        .then(
                            (fullfilledResponse: { response: http.ClientResponse, body: any }) =>
                            {
                                if (fullfilledResponse.body && fullfilledResponse.body.controllerType) {
                                    this.isTargetEpic = true;
                                    this.hasDeterminedSystemType = true;

                                    callback();
                                }
                                else {
                                    // Reset to SNAP
                                    this.setToSnap();
                                    callback(); // error ?
                                }
                            })
                        .catch((error: any) =>
                        {
                            this.setToSnap(); // Reset to SNAP

                            // Neither worked.
                            callback(error);
                        });
                });
        }
    }


    public hasConfigError(): boolean
    {
        if (this.configError === undefined) {

            // Check for bad API keys
            if (!this.apiKeyValue) {
                this.configError = true; // Bad API key ID or Value
            }
            else {
                this.configError = false;
            }
        }

        return this.configError;
    }

}
