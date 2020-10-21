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
import * as NodeRed from 'opto22-node-red-common/typings/nodered';
import { PacUtil } from "./pac-util";
import { PacNodeBaseImpl } from "../../nodes/base-node";


class MockPacReadNode extends MockNode.MockNode
{
    constructor(onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        super('pac-read', onSend, onError);
    }
}

class MockPacWriteNode extends MockNode.MockNode
{
    constructor(onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        super('pac-write', onSend, onError);
    }
}



describe('PAC Nodes', function()
{
    var deviceConfig: ConfigHandler.DeviceConfiguration


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
                initTests(callback);
            },
        ],
            (error: any, result: any) =>
            {
                beforeDone(error);
            }
        );
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

    function initTests(cb: () => void)
    {
        // Create a "pac-device" device configuration.
        deviceConfig = createDeviceConfig('deviceId0', TestSettings.pacAddress, TestSettings.useHttps,
            TestSettings.pacKeyId, TestSettings.pacKeyValue);

        ConfigHandler.controllerConnections.createControllerConnection(deviceConfig.address,
            deviceConfig.protocol.toLowerCase() !== 'http',
            deviceConfig.credentials.key, deviceConfig.credentials.secret,
            null, null, 'REJECT_NEW', deviceConfig.id, true);

        let controllerConnection = ConfigHandler.controllerConnections.getController(deviceConfig.id);

        should.exist(controllerConnection);

        var RED = new MockRed.MockRed();


        ReadNodeHandler.setRED(RED);
        WriteNodeHandler.setRED(RED);
        ConfigHandler.setRED(RED);

        controllerConnection.ctrl.getDeviceType(undefined, cb);
    }

    function createDeviceConfig(deviceId: string, address: string, useHttps: boolean,
        key: string, secret: string): ConfigHandler.DeviceConfiguration
    {
        var deviceConfig: ConfigHandler.DeviceConfiguration = {
            id: deviceId,
            address: address,
            msgQueueFullBehavior: 'REJECT_NEW',
            protocol: useHttps ? "https" : "http",
            credentials:
            {
                key: key,
                secret: secret,
                publicCertPath: '',
                caCertPath: '',
            }

        };
        return deviceConfig;
    }

    function injectTimestampMsg(nodeConfig, deviceConfig, node)
    {
        injectMsg(nodeConfig, deviceConfig, node, { "payload": 1466009468654 });
    }

    function injectMsg(nodeConfig, deviceConfig, node, msg)
    {
        // Create the node's worker implementation.
        var nodeHandlerImpl: PacNodeBaseImpl;
        if (nodeConfig.type === 'pac-read') {
            nodeHandlerImpl = new ReadNodeHandler.PacReadNodeImpl(nodeConfig, deviceConfig, node);
        }
        else if (nodeConfig.type === 'pac-write') {
            nodeHandlerImpl = new WriteNodeHandler.PacWriteNodeImpl(nodeConfig, deviceConfig, node);
        }

        // Send it a basic message, like an Inject Timestamp node does.
        nodeHandlerImpl.addMsg(msg);
    }

    function testReadNode(deviceId: string, dataType: string, tagName: string,
        responseCallback: (msg: any) => void, msg?: any, valueType?: string,
        valueProperty?: string, topicType?: string, topicProperty?: string): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-read",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "tableStartIndex": "",
            "tableLength": "",
            "valueType": valueType || 'msg.payload',
            "value": valueProperty || '',
            "topicType": topicType || 'none',
            "topic": topicProperty || '',
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacReadNode(responseCallback);

        if (msg !== undefined) {
            injectMsg(nodeConfig, deviceConfig, node, msg);
        }
        else {
            injectTimestampMsg(nodeConfig, deviceConfig, node);
        }
    }

    function testWriteNode(deviceId: string, dataType: string, tagName: string, valueType: string,
        valueProperty, msg: any, responseCallback: (msg: any) => void): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-write",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "valueType": valueType,
            "value": valueProperty,
            "tableStartIndex": "",
            "tableLength": "",
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacWriteNode(responseCallback);

        injectMsg(nodeConfig, deviceConfig, node, msg);
    }

    function testReadNodeError(deviceId: string, dataType: string, tagName: string,
        msg: any | undefined, errorCallback: (errorText: any, nodeMessage: any) => void): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-read",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "tableStartIndex": "",
            "tableLength": "",
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacReadNode(null, errorCallback);

        if (msg !== undefined) {
            injectMsg(nodeConfig, deviceConfig, node, msg);
        }
        else {
            injectTimestampMsg(nodeConfig, deviceConfig, node);
        }
    }

    function testWriteNodeError(deviceId: string, dataType: string, tagName: string,
        valueType: string, valueProperty, msg: any,
        errorCallback: (errorText: any, nodeMessage: any) => void): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-write",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "valueType": valueType,
            "value": valueProperty,
            "tableStartIndex": "",
            "tableLength": "",
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacWriteNode(null, errorCallback);

        injectMsg(nodeConfig, deviceConfig, node, msg);
    }

    it('#readStrategyInfo', function(done)
    {
        testReadNode(deviceConfig.id, 'strategy-info', '',
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
        testReadNode(deviceConfig.id, 'device-info', '',
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
        assertRead(deviceConfig.id, 'int32-variable', 'nAlways123', 123, done);
    });

    it('#readInt64Variable', function(done)
    {
        assertRead(deviceConfig.id, 'int64-variable', 'nnAlways2147483647', '2147483647', done);
    });

    it('#readFloatVariable', function(done)
    {
        assertRead(deviceConfig.id, 'float-variable', 'fAlways123Dot456', 123.456, undefined, true);
        assertRead(deviceConfig.id, 'float-variable', 'fAlwaysNeg1', -1);

        done();
    });

    it('#readBooleanVariable', function(done)
    {
        assertRead(deviceConfig.id, 'int32-variable', 'bAlwaysOn', 1);
        assertRead(deviceConfig.id, 'int32-variable', 'bAlwaysOff', 0);

        done();
    });


    it('#readInt32Variables', function(done)
    {
        testReadNode(deviceConfig.id, 'int32-variable', '', (msg: any) =>
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

        testReadNode(deviceConfig.id, 'int32-variable', 'nAlways1230',
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
        testReadNode(deviceConfig.id, 'int32-variable', 'nAlways123',
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
        testReadNode(deviceConfig.id, 'device-info', '',
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
        testReadNode(deviceConfig.id, 'int32-variable', 'nAlways1',
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

    function delayed(done)
    {
        // Intentionally delay so that the TCP reset from the controller will not cause problems
        // in the next request.
        setTimeout(() =>
        {
            done(); // Tell Mocha that we're done.
        }, 100);
    }

    it('#readVariableMissing',
        function(done)
        {
            testReadNodeError(deviceConfig.id, 'int32-variable', 'tag not here', undefined,
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

    it('#writeVariableMissing', function(done)
    {
        testReadNodeError(deviceConfig.id, 'int32-variable', 'tag not here', undefined,
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

    function assertRead(deviceConfigId: string, tagDataType: string, tagName: string,
        value: any, done?: () => any, doFround?: boolean)
    {
        testReadNode(deviceConfig.id, tagDataType, tagName, (msg: any) =>
        {
            let msgPayload = doFround ? (<any>Math).fround(msg.payload) : msg.payload;
            let msgBodyValue = doFround ? (<any>Math).fround(msg.body.value) : msg.body.value;
            value = doFround ? (<any>Math).fround(value) : value;

            should(msgPayload).equal(value);
            should(msgBodyValue).equal(value);

            if (done) {
                done(); // Tell Mocha that we're done.
            }
        });
    }

    function assertWrite(deviceConfigId: string, tagDataType: string, tagName: string,
        valueType: string, valueProperty, valueObj: any, value: any, done?: () => any)
    {
        testWriteNode(deviceConfigId, tagDataType, tagName, valueType, valueProperty, valueObj,
            (msg: any) =>
            {
                should(msg.body.errorCode).equal(0);

                // Do a Read to vefify the Write.
                assertRead(deviceConfig.id, tagDataType, tagName, value, done);
            });

    }

    it('#writeInt32VarFromMsgPayloadNumber', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg.payload', '',
            { payload: 22 }, 22, done);
    });

    it('#writeInt32VarFromMsgPayloadString', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg.payload', '',
            { payload: '33' }, 33, done);
    });

    it('#writeInt32VarFromMsgPayloadBoolean', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg.payload', '', { payload: true },
            1);
        assertWrite(deviceConfig.id, 'int32-variable', 'n2', 'msg.payload', '', { payload: false },
            0);

        done();
    });


    it('#writeInt32Var with msg.payload == null should cause an error', function(done)
    {
        testWriteNodeError(deviceConfig.id, 'int32-variable', 'n1', 'msg.payload', '',
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
        testWriteNodeError(deviceConfig.id, 'string-variable', 's5', 'msg.payload', '',
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
        assertWrite(deviceConfig.id, 'string-variable', 's5', 'msg.payload', '', { payload: 22 },
            '22', done);
    });

    it('#writeStringVarFromMsgPayloadString', function(done)
    {
        assertWrite(deviceConfig.id, 'string-variable', 's5', 'msg.payload', '',
            { payload: 'abc XYZ' }, 'abc XYZ', done);
    });

    it('#writeStringVarFromMsgPayloadBoolean', function(done)
    {
        assertWrite(deviceConfig.id, 'string-variable', 's4', 'msg.payload', '',
            { payload: true }, 'true');
        assertWrite(deviceConfig.id, 'string-variable', 's5', 'msg.payload', '',
            { payload: false }, 'false');

        done();
    });

    it('#writeVariableFromMsgProperty', function(done)
    {
        var msg = { 'value': { 'whatever': 99 } };
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg', 'value.whatever', msg,
            99, done);
    });

    it('#writeVariableFromUiValue', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'value', '88', {}, 88, done);
    });

});
