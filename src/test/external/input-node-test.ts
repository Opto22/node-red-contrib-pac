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
import * as InputNodeHandler from "../../nodes/input-node";
import * as MockRed from "../../../submodules/opto22-node-red-common/src/mocks/MockRed";
import * as MockNode from "../../../submodules/opto22-node-red-common/src/mocks/MockNode";

import should = require('should');
import assert = require('assert');
import * as async from 'async';
import * as NodeRed from '../../../submodules/opto22-node-red-common/typings/nodered';
import * as PacUtil from "./pac-util";
import { FunctionNodeBaseImpl } from "../../nodes/base-node";
import { MockDeviceNode, TestSettings, createFullInputNode, beforeWorker, createDeviceConfig, testReadNode, testReadNodeError, assertRead, delayed, updateTestSettingsForGroov, initTests, createDeviceConfigNode, MockPacInputNode } from "./test-util";

var showLogs = false;
function log(msg: string)
{
    if (showLogs)
        console.log(msg);
}

class AsyncIoTestHelper
{
    public msgCount = 0;
    public inputNodeImpl: InputNodeHandler.PacInputNodeImpl;
    public inputNode: MockPacInputNode;

    constructor(
        public deviceConfig: ConfigHandler.DeviceConfiguration,
        public nodeDataType: string,
        public tagName: string,
        public hostClient: PacUtil.OptoHost)
    {
    }


    writeInt32 = (value: number, done: (err: any) => void) =>
    {
        this.hostClient.sendRecvCmd(value + ' ^' + this.tagName + ' @!', done);
    }

    setDigitalInputIval = (state: boolean, done: (err: any) => void) =>
    {
        this.hostClient.sendRecvCmd('~' + this.tagName + (state ? ' IN.ON' :  ' IN.OFF'), done);
    }

    

    createInputNode = (useScannerTimer: boolean, done: (err: any) => void) =>
    {
        log('createInputNode');
        var nodeAndImpl = createFullInputNode(this.deviceConfig.id,
            {
                dataType: this.nodeDataType,
                tagName: this.tagName,
                scanTimeSec: useScannerTimer ? '0.25' : '-1'
            },
            // Wrap the callback so that the test can replace it as needed.
            (msg: any) =>
            {
                log('new msg, payload=' + msg.payload);
                this.msgCount++;
                this.msgCallback(msg);
            });

        this.inputNode = nodeAndImpl.node;
        this.inputNodeImpl = nodeAndImpl.nodeImpl;

        process.nextTick(done);
    }


    public msgCallback = (done: () => void) =>
    {
        // start empty
        process.nextTick(done);
    };

    setMsgCallback(msgCallback: (msg: any) => void)
    {
        // Replace the callback
        this.msgCallback = msgCallback;
    }

    forceScan = (next: () => void) =>
    {
        log('forceScan');
        this.inputNodeImpl.onScan();
        setTimeout(next, 100); // Wait a moment before continuing
    }


    setAssertForNextMsg_Digital(expected: any, //Partial<ApiLib.AnalogChannelRead>,
        expectedMsgCount: number, done?: () => void)
    {
        log('setAssertForNextMsg_Digital');

        this.setMsgCallback((actualMsg: any) =>
        {

            log('setAssertForNextMsg_Digital, actualMsg=' + JSON.stringify(actualMsg, undefined, 2));

            //TestUtil.assertAnalogChannelRead(actualMsg, expected);
            should(actualMsg.payload).be.eql(expected);
            should(actualMsg.body).be.eql({ value: expected });
            should(actualMsg.inputType).be.eql(this.nodeDataType);
            should(this.msgCount).be.eql(expectedMsgCount);

            if (done) {
                this.inputNode.onClose();
                done();
            }
        });
    }

    setAssertForNextMsg_Int32Read(expected: any, //Partial<ApiLib.AnalogChannelRead>,
        expectedMsgCount: number, done?: () => void)
    {
        log('setAssertForNextMsg_Int32Read');

        this.setMsgCallback((actualMsg: any) =>
        {

            log('setAssertForNextMsg_Int32Read, actualMsg=' + JSON.stringify(actualMsg, undefined, 2));

            //TestUtil.assertAnalogChannelRead(actualMsg, expected);
            should(actualMsg.payload).be.eql(expected);
            should(actualMsg.body).be.eql({ value: expected });
            should(actualMsg.inputType).be.eql(this.nodeDataType);
            should(this.msgCount).be.eql(expectedMsgCount);

            if (done) {
                this.inputNode.onClose();
                done();
            }
        });
    }
}

describe('PAC Input Node', function()
{
    var deviceConfig: ConfigHandler.DeviceConfiguration;
    var deviceConfigNode: MockDeviceNode;
    var hostClient: PacUtil.OptoHost;


    before(function(beforeDone: MochaDone)
    {
        this.timeout(10000);

        beforeWorker((error: any, deviceConfigResult?: ConfigHandler.DeviceConfiguration) =>
        {
            deviceConfig = deviceConfigResult;
            deviceConfigNode = createDeviceConfigNode(deviceConfig);

            hostClient = new PacUtil.OptoHost(deviceConfig.address, 22001, true);

            hostClient.connect((err: Error) =>
            {
                beforeDone();
            });
        });
    });


    it('uses sensible defaults for invalid user input', function(testDone)
    {
        var inputNodeAndImpl = createFullInputNode(deviceConfig.id, {
            scanTimeSec: 'not a number',
            deadband: 'not a number'
        }, (msg) =>
        {
        });

        var inputNodeImpl = inputNodeAndImpl.nodeImpl;
        should(inputNodeImpl).property('scanTimeMs').be.eql(1000);
        should(inputNodeImpl).property('deadband').be.eql(1);
        testDone();
    });

    describe('Variables', function()
    {

        it('sends message when INT32 value changes', function(testDone)
        {
            this.timeout(8000);

            var testValue = 456;
            var tagName = 'n2';
            var asyncTestHelper = new AsyncIoTestHelper(deviceConfigNode, 'int32-variable', tagName, hostClient);

            async.series([
                // Set output to 0 and reset input values
                (next: () => void) => { asyncTestHelper.writeInt32(22, next) },
                // Create the node
                (next: () => void) => { asyncTestHelper.createInputNode(false, next); },
                // // Force a scan (to capture the initial state).
                (next: () => void) => { asyncTestHelper.forceScan(next); },
                // // Register the assert for the expected next message.
                (next: () => void) =>
                {
                    asyncTestHelper.setAssertForNextMsg_Int32Read(testValue, 1, testDone);
                    process.nextTick(next);
                },
                // Set the output's value
                (next: () => void) => { asyncTestHelper.writeInt32(testValue, next) },
                // Force a scan
                (next: () => void) => { asyncTestHelper.forceScan(next); },
            ], (err?: Error) =>
            {
                should(err).be.null();
            });
        });

        it('sends message when Digital Input state changes', function(testDone)
        {
            this.timeout(8000);

            var tagName = 'diSwitchD0';
            var asyncTestHelper = new AsyncIoTestHelper(deviceConfigNode, 'dig-input-state', tagName, hostClient);

            async.series([
                // Set output to 0 and reset input values
                (next: () => void) => { asyncTestHelper.setDigitalInputIval(false, next) },
                // Create the node
                (next: () => void) => { asyncTestHelper.createInputNode(false, next); },
                // // Force a scan (to capture the initial state).
                (next: () => void) => { asyncTestHelper.forceScan(next); },
                // // Register the assert for the expected next message.
                (next: () => void) =>
                {
                    asyncTestHelper.setAssertForNextMsg_Digital(true, 1);
                    process.nextTick(next);
                },
                // Set the output's value
                (next: () => void) => { asyncTestHelper.setDigitalInputIval(true, next) },
                // Force a scan
                (next: () => void) => { asyncTestHelper.forceScan(next); },
                // // Register the assert for the expected next message.
                (next: () => void) =>
                {
                    asyncTestHelper.setAssertForNextMsg_Digital(false, 2, testDone);
                    process.nextTick(next);
                },
                // Set the output's value
                (next: () => void) => { asyncTestHelper.setDigitalInputIval(false, next) },
                // Force a scan
                (next: () => void) => { asyncTestHelper.forceScan(next); },
            ], (err?: Error) =>
            {
                should(err).be.null();
            });
        });
    });

});
