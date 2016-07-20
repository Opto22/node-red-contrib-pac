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

var ControllerApi = ApiLib.AllApi;

// The TypeScript client generated with swagger-codegen does not allow us to add our own
// options to the Request library. However, there is an empty and useless default 
// authentication field which we can override and use it as a general extension point.
class RequestOptionsModifier
{
    private publicCertFile: Buffer;
    private caCertFile: Buffer;

    constructor(private publicCertPath: string, private caCertPath: string, private agent: https.Agent, private https: boolean)
    {
        if (this.publicCertPath && this.publicCertPath.length > 0) {
            this.publicCertFile = fs.readFileSync(this.publicCertPath);
        }

        if (this.caCertPath && this.caCertPath.length > 0) {
            this.caCertFile = fs.readFileSync(this.caCertPath);
        }

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

            requestOptions.port = 443;
        }
        else {
            requestOptions.port = 80;
        }

        requestOptions.forever = true;
        requestOptions.agent = this.agent;
    }
}


export class ControllerApiEx extends ControllerApi
{
    private https: boolean;
    private publicCertPath: string;
    private caCertPath: string;
    private httpAgent: http.Agent; // TODO: do we need to keep this around?
    private event: events.EventEmitter;

    constructor(username: string, password: string, basePath: string, https: boolean,
        publicCertPath: string, caCertPath: string)
    {
        super(username, password, basePath);
        this.https = https;
        this.publicCertPath = publicCertPath;
        this.caCertPath = caCertPath;

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
            this.authentications.default = new RequestOptionsModifier(this.publicCertPath, this.caCertPath,
                httpsAgent, this.https);
        }
        else {
            var httpAgent = new http.Agent(
                {
                    keepAlive: true,
                    maxSockets: 1 // might not be needed anymore, since we now use MessageQueue.
                });

            this.httpAgent = httpAgent;

            // Replace the default authentication handler.
            this.authentications.default = new RequestOptionsModifier(null, null, httpAgent, this.https);
        }
    }

}
