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

var NodeRedUtil = require('node-red/red/runtime/util');
import NodeRed = require('node-red');

// Not sure if we need to create a mock RED or can use the real thing.
// At least initially only Util functions were needed.
export class MockRed implements NodeRed.RED
{
    nodes: NodeRed.Nodes;
    util: NodeRed.Util;
    log: NodeRed.Log;

    constructor()
    {
        this.util = NodeRedUtil;
    }
}
