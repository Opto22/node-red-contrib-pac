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
import * as MockNode from "../node-red/MockNode";
import * as MockRed from "../node-red/MockRed";
import { GroovUtil, UserFullData, PromiseResponse } from "./groov-util";
var TestSettings = require('./settings.json');

import should = require('should');
import assert = require('assert');
import * as async from 'async';
import * as NodeRed from '../../../submodules/opto22-node-red-common/typings/nodered';
import { PacUtil } from "./pac-util";
import { FunctionNodeBaseImpl } from "../../nodes/base-node";
import { beforeWorker, injectMsg, assertWrite, testWriteNodeError, delayed, createDeviceConfig, initTests, testReadNodeError } from "./test-util";


describe('PAC Write Node', function()
{
    var deviceConfig: ConfigHandler.DeviceConfiguration;

    before(function(beforeDone: MochaDone)
    {
        this.timeout(10000);

        beforeWorker((error: any, deviceConfigResult?: ConfigHandler.DeviceConfiguration) =>
        {
            deviceConfig = deviceConfigResult;
            beforeDone();
        });
    });

    // For Groov units, we need to get the API key from the device by using the user's
    // username and password. This works much better in testing environments when 
    // API keys get reset whenever a device is reset to defaults. 
    function updateTestSettingsForGroov(cb: (error?: any) => void)
    {
        GroovUtil.getUserData(TestSettings.groovAddress, TestSettings.groovUsername, TestSettings.groovPassword).then(
            (fullfilledResponse: PromiseResponse) =>
            {
                var userData: UserFullData = fullfilledResponse.body;

                // Copy over all the settings to what gets used from here on out.
                TestSettings.pacAddress = TestSettings.groovAddress;
                TestSettings.pacKeyId = 'apiKey';
                TestSettings.pacKeyValue = userData.apiKey;

                cb();
            },
            (error: any) =>
            {
                console.log('error = ' + JSON.stringify(error));
                cb(error);
            })
    }

    it('#writeVariableMissing', function(done)
    {
        testReadNodeError(deviceConfig, 'int32-variable', 'tag not here', undefined,
            (errorText: any, msg: any) =>
            {
                //console.log('msg = ' + JSON.stringify(msg));

                // Do the actual checks here.
                should.exist(msg.payload);
                should.exist(msg.pacError.statusCode);
                should.exist(msg.pacError.body.errorCode);
                should(msg.pacError.statusCode).equal(404);
                should(msg.pacError.body.errorCode).equal(-28);

                delayed(done);
            });
    });



    it('#writeInt32VarFromMsgPayloadNumber', function(done)
    {
        assertWrite(deviceConfig, 'int32-variable', 'n1', 'msg.payload', '',
            { payload: 22 }, 22, done);
    });

    it('#writeInt32VarFromMsgPayloadString', function(done)
    {
        assertWrite(deviceConfig, 'int32-variable', 'n1', 'msg.payload', '',
            { payload: '33' }, 33, done);
    });

    it('#writeInt32VarFromMsgPayloadBoolean', function(done)
    {
        assertWrite(deviceConfig, 'int32-variable', 'n1', 'msg.payload', '', { payload: true },
            1);
        assertWrite(deviceConfig, 'int32-variable', 'n2', 'msg.payload', '', { payload: false },
            0);

        done();
    });


    it('#writeInt32Var with msg.payload == null should cause an error', function(done)
    {
        testWriteNodeError(deviceConfig, 'int32-variable', 'n1', 'msg.payload', '',
            { payload: null },
            (errorText: any, msg: any) =>
            {
                should(errorText).be.eql('"null" is not a valid value.');
                should(msg.payload).be.null();
                done();
            });
    });


    it('#writeStringVar with msg.payload == null should cause an error', function(done)
    {
        testWriteNodeError(deviceConfig, 'string-variable', 's5', 'msg.payload', '',
            { payload: null },
            (errorText: any, msg: any) =>
            {
                should(errorText).be.eql('"null" is not a valid value.');
                should(msg.payload).be.null();
                done();
            });
    });

    it('#writeStringVarFromMsgPayloadNumber', function(done)
    {
        assertWrite(deviceConfig, 'string-variable', 's5', 'msg.payload', '', { payload: 22 },
            '22', done);
    });

    it('#writeStringVarFromMsgPayloadString', function(done)
    {
        assertWrite(deviceConfig, 'string-variable', 's5', 'msg.payload', '',
            { payload: 'abc XYZ' }, 'abc XYZ', done);
    });

    it('#writeStringVarFromMsgPayloadBoolean', function(done)
    {
        assertWrite(deviceConfig, 'string-variable', 's4', 'msg.payload', '',
            { payload: true }, 'true');
        assertWrite(deviceConfig, 'string-variable', 's5', 'msg.payload', '',
            { payload: false }, 'false');

        done();
    });

    it('#writeVariableFromMsgProperty', function(done)
    {
        var msg = { 'value': { 'whatever': 99 } };
        assertWrite(deviceConfig, 'int32-variable', 'n1', 'msg', 'value.whatever', msg,
            99, done);
    });

    it('#writeVariableFromUiValue', function(done)
    {
        assertWrite(deviceConfig, 'int32-variable', 'n1', 'value', '88', {}, 88, done);
    });

});
