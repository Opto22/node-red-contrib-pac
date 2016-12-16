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

import * as NodeHandlers from "./node-handlers";
import * as ConfigHandler from "./config-handler";
import * as NodeRed from 'opto22-node-red-common/typings/nodered';
import semver = require('semver');

var module: any;


function checkVersion(RED: NodeRed.RED)
{
    var minNodeJsRequired = 'v4.4.5';
    if (semver.lt(process.version, minNodeJsRequired)) {
        RED.log.warn('The Opto 22 PAC nodes require Node.js ' + minNodeJsRequired + ' or greater.');
    }
}

// Register the nodes and initialize the implementation module.
// The implementation is kept in a separate module so that the unit test code can access it.
// Node-RED requires this module's 'exports' to be set to 'function(RED)'.
module.exports = function(RED: NodeRed.RED)
{
    checkVersion(RED);

    // Pass in the global RED object to our modules. 
    NodeHandlers.setRED(RED);
    ConfigHandler.setRED(RED);

    // Register the nodes and their handlers.
    RED.nodes.registerType("pac-read", NodeHandlers.createSnapPacReadNode);
    RED.nodes.registerType("pac-write", NodeHandlers.createSnapPacWriteNode);
    RED.nodes.registerType("pac-device", ConfigHandler.createSnapPacDeviceNode,
        {
            credentials: {
                key: { type: "text" },
                secret: { type: "password" },
                publicCertPath: { type: "text" },
                caCertPath: { type: "text" }
            }
        });
}
