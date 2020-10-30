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

import * as ConfigHandler from "../../config-handler";
import * as ReadNodeHandler from "../../nodes/read-node";
import * as WriteNodeHandler from "../../nodes/write-node";
import * as MockRed from "../../../submodules/opto22-node-red-common/src/mocks/MockRed";
import * as MockNode from "../../../submodules/opto22-node-red-common/src/mocks/MockNode";

import should = require('should');
import assert = require('assert');
import * as async from 'async';
import * as NodeRed from '../../../submodules/opto22-node-red-common/typings/nodered';
import { PacUtil } from "./pac-util";
import { FunctionNodeBaseImpl } from "../../nodes/base-node";
import { TestSettings, createFullInputNode, beforeWorker, createDeviceConfig, testReadNode, testReadNodeError, assertRead, delayed, updateTestSettingsForGroov, initTests, createDeviceConfigNode } from "./test-util";




describe('PAC Input Node', function()
{
    var deviceConfig: ConfigHandler.DeviceConfiguration;

    before(function(beforeDone: MochaDone)
    {
        this.timeout(10000);

        beforeWorker((error: any, deviceConfigResult?: ConfigHandler.DeviceConfiguration) =>
        {
            deviceConfig = deviceConfigResult;
            var deviceConfigNode = createDeviceConfigNode(deviceConfig);

            beforeDone();
        });
    });


    it('uses sensible defaults for invalid user input', function(testDone)
    {
        var inputNodeAndImpl = createFullInputNode(deviceConfig.id, {
            scanTimeSec: 'not a number',
            deadband: 'not a number'
        }, (msg) => {
        });

        var inputNodeImpl = inputNodeAndImpl.nodeImpl;
        should(inputNodeImpl).property('scanTimeMs').be.eql(1000);
        should(inputNodeImpl).property('deadband').be.eql(1);
        testDone();
    });

   

});
