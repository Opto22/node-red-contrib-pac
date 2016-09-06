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

/** 
 * A meager collection of Node-RED types for TypeScript.
 * Not much more than what the SNAP PAC nodes need.
 */
declare module "node-red" {

    // https://github.com/node-red/node-red/blob/master/red/runtime/nodes/Node.js
    export interface Node
    {
        id: string;
        type: string;
        z: string;
        name?: string;

        on(type: string, callback: (any) => void): void;
        error(errorText: any, nodeMessage: any);
        warn(text: string);
        log(text: string);
        status(statusObj: any);
        send(nodeMessage: any);
    }

    // https://github.com/node-red/node-red/blob/master/red/runtime/nodes/index.js
    export class Nodes
    {
        createNode(node: Node, config: any);
        getNode(node: string);
        registerType(type, constructor, opts?: any);
    }

    // https://github.com/node-red/node-red/blob/master/red/runtime/log.js
    export class Log
    {
        log(msg: string);
        info(msg: string);
        warn(msg: string);
        error(msg: string);
        trace(msg: string);
        debug(msg: string);
        metric(msg: string);
    }

    // https://github.com/node-red/node-red/blob/master/red/runtime/util.js
    export class Util
    {
        cloneMessage(msg: any): any;
        compareObjects(obj1: any, obj2: any): boolean;
        generateId(): string;
        getMessageProperty(msg: any, expr: string);
        setMessageProperty(msg: any, property: string, value: any, createMissing?: boolean);
        evaluateNodeProperty(value: any, type: string, node: Node, msg: any): any;
    }

    // https://github.com/node-red/node-red/blob/master/red/red.js
    export interface RED
    {
        nodes: Nodes;
        util: Util;
        log: Log;
    }

}
