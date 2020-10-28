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



import should = require('should');
import assert = require('assert');
import * as async from 'async';
import * as NodeRed from '../../../submodules/opto22-node-red-common/typings/nodered';
import { PacUtil } from "./pac-util";
import { FunctionNodeBaseImpl } from "../../nodes/base-node";
import { TestSettings, testReadNode, testReadNodeError, assertRead, delayed, updateTestSettingsForGroov, initTests } from "./test-util";




describe('PAC Read Node', function()
{
    var deviceConfig: ConfigHandler.DeviceConfiguration;


    before(function(beforeDone: MochaDone)
    {
        this.timeout(10000);

        async.waterfall([
            (callback: (error: any) => void) =>
            {
                if (TestSettings.groovAddress)
                    updateTestSettingsForGroov(callback);
                else
                    process.nextTick(callback);
            },
            (callback: (error: any) => void) =>
            {
                PacUtil.downloadStrategy(TestSettings.pacAddress,
                    'test/pac/NodeRedTester.cdf',
                    { run: true },
                    (error: any) =>
                    {
                        if (error) {
                            console.log('downloadStrategy error: ' + error);
                        }
                        callback(error);
                    });
            },
            (callback: () => void) =>
            {
                deviceConfig = initTests(callback);
            },
        ],
            (error: any, result: any) =>
            {
                beforeDone(error);
            }
        );
    });


    it('#readStrategyInfo', function(done)
    {
        testReadNode(deviceConfig, 'strategy-info', '',
            (msg: any) =>
            {
                // Do the actual checks here.

                // Verify that the PAC Control strategy is correct.
                // It's located in the "test/pac" folder of this repository. 
                should(msg.payload.strategyName).be.equal('NodeRedTester');

                should.exist(msg.payload);
                should.exist(msg.payload.strategyName);
                should.exist(msg.payload.date);
                should.exist(msg.payload.time);
                should.exist(msg.payload.crc);
                should.exist(msg.payload.runningCharts);

                done();// Tell Mocha that we're done.
            });
    });

    it('#readDeviceInfo', function(done)
    {
        testReadNode(deviceConfig, 'device-info', '',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.payload);
                should.exist(msg.payload.controllerType);
                should.exist(msg.payload.firmwareVersion);
                should.exist(msg.payload.firmwareDate);
                should.exist(msg.payload.firmwareTime);
                should.exist(msg.payload.upTimeSeconds);
                should(msg.payload.upTimeSeconds).be.greaterThan(0);

                done(); // Tell Mocha that we're done.
            });
    });

    it('#readInt32Variable', function(done)
    {
        assertRead(deviceConfig, 'int32-variable', 'nAlways123', 123, done);
    });

    it('#readInt64Variable', function(done)
    {
        assertRead(deviceConfig, 'int64-variable', 'nnAlways2147483647', '2147483647', done);
    });

    it('#readFloatVariable', function(done)
    {
        assertRead(deviceConfig, 'float-variable', 'fAlways123Dot456', 123.456, undefined, true);
        assertRead(deviceConfig, 'float-variable', 'fAlwaysNeg1', -1);

        done();
    });

    it('#readBooleanVariable', function(done)
    {
        assertRead(deviceConfig, 'int32-variable', 'bAlwaysOn', 1);
        assertRead(deviceConfig, 'int32-variable', 'bAlwaysOff', 0);

        done();
    });


    it('#readInt32Variables', function(done)
    {
        testReadNode(deviceConfig, 'int32-variable', '', (msg: any) =>
        {
            // We don't want to be too fragile here. The strategy should be able to be changed a bit
            // without breaking these tests.

            should(msg.payload).be.Array();
            should(msg.payload.length).be.greaterThan(10);

            msg.payload.forEach((element, index, array) =>
            {
                should(element.name).be.String();
                should(element.value).be.Number();
            });

            // Look for a few known values.
            should(msg.payload).containEql({ name: 'nAlways0', value: 0 });
            should(msg.payload).containEql({ name: 'nAlways1', value: 1 });
            should(msg.payload).containEql({ name: 'nAlways123', value: 123 });

            if (done) {
                done(); // Tell Mocha that we're done.
            }
        });
    });



    it('#readVariableFromDynamicMsgProperty', function(done)
    {
        var msg = {
            payload: {
                tagName: 'nAlways1'
            }
        };

        testReadNode(deviceConfig, 'int32-variable', 'nAlways1230',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.payload);
                should(msg.payload).be.type('number');
                should.exist(msg.body.value);
                should(msg.payload).equal(1);
                should(msg.payload).equal(msg.body.value);

                done(); // Tell Mocha that we're done.
            }, msg);
    });

    it('#readVariableIntoCustomMsgPropertySimple', function(done)
    {
        // Write the read value into a simple property ('whatever')
        testReadNode(deviceConfig, 'int32-variable', 'nAlways123',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.whatever);
                should(msg.whatever).be.type('number');
                should.exist(msg.body.value);
                should(msg.whatever).equal(123);
                should(msg.whatever).equal(msg.body.value);

                done(); // Tell Mocha that we're done.
            }, undefined, 'msg', 'whatever');
    });

    it('#readVariableIntoCustomMsgPropertyComplex', function(done)
    {
        // Write the read object into a nested property ('data.device.Info')
        testReadNode(deviceConfig, 'device-info', '',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.data.device.Info);
                should.exist(msg.data.device.Info.controllerType);
                should.exist(msg.data.device.Info.firmwareVersion);
                should.exist(msg.data.device.Info.firmwareDate);
                should.exist(msg.data.device.Info.firmwareTime);
                should.exist(msg.data.device.Info.upTimeSeconds);
                should(msg.data.device.Info.upTimeSeconds).be.greaterThan(0);

                done(); // Tell Mocha that we're done.
            }, undefined, 'msg', "data.device.Info");
    });

    it('#reading with msg.payload == null should NOT cause any problems.', function(done)
    {
        testReadNode(deviceConfig, 'int32-variable', 'nAlways1',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.payload);
                should(msg.payload).be.type('number');
                should.exist(msg.body.value);
                should(msg.payload).equal(1);
                should(msg.payload).equal(msg.body.value);

                done(); // Tell Mocha that we're done.
            }
        );
    });

    it('#readVariableMissing',
        function(done)
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

});
