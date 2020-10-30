import * as async from 'async';
import { PacUtil } from "./pac-util";
import should = require('should');
import * as NodeRed from '../../../submodules/opto22-node-red-common/typings/nodered';
import * as MockRed from "../../../submodules/opto22-node-red-common/src/mocks/MockRed";
import * as MockNode from "../../../submodules/opto22-node-red-common/src/mocks/MockNode";

import * as ConfigHandler from "../../config-handler";
import * as ReadNodeHandler from "../../nodes/read-node";
import * as WriteNodeHandler from "../../nodes/write-node";
import * as InputNodeHandler from "../../nodes/input-node";
import { FunctionNodeBaseImpl } from "../../nodes/base-node";
import { GroovUtil, UserFullData, PromiseResponse } from "./groov-util";

export var TestSettings = require('./settings.json');

var RED = new MockRed.MockRed();

export class MockPacInputNode extends MockNode.MockNode
{
    constructor(onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        super('pac-input', onSend, onError);
    }
}
export class MockPacReadNode extends MockNode.MockNode
{
    constructor(onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        super('pac-read', onSend, onError);
    }
}

export class MockPacWriteNode extends MockNode.MockNode
{
    constructor(onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        super('pac-write', onSend, onError);
    }
}


export class MockDeviceNode extends MockNode.MockNode implements ConfigHandler.DeviceConfiguration
{
    address: string;
    credentials: ConfigHandler.DeviceCredentials;
    protocol: string;
    msgQueueFullBehavior: 'REJECT_NEW';

    constructor(id: string,
        address: string,
        credentials:
            {
                key: string,
                secret: string,
                publicCertPath: string,
                caCertPath: string,
            })
    {
        super('pac-device');
        this.id = id;
        this.address = address;
        this.credentials = credentials;
    }
}


export function injectTimestampMsg(nodeConfig, deviceConfig, node)
{
    injectMsg(nodeConfig, deviceConfig, node, { "payload": 1466009468654 });
}


export function injectMsg(nodeConfig, deviceConfig: ConfigHandler.DeviceConfiguration,
    node, msg)
{
    // Create the node's worker implementation.
    var nodeHandlerImpl: FunctionNodeBaseImpl;
    if (nodeConfig.type === 'pac-read') {
        nodeHandlerImpl = new ReadNodeHandler.PacReadNodeImpl(nodeConfig, deviceConfig, node);
    }
    else if (nodeConfig.type === 'pac-write') {
        nodeHandlerImpl = new WriteNodeHandler.PacWriteNodeImpl(nodeConfig, deviceConfig, node);
    }

    // Send it a basic message, like an Inject Timestamp node does.
    nodeHandlerImpl.addMsg(msg);
}

// For Groov units, we need to get the API key from the device by using the user's
// username and password. This works much better in testing environments when 
// API keys get reset whenever a device is reset to defaults. 
export function updateTestSettingsForGroov(cb: (error?: any) => void)
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


export function beforeWorker(
    cb: (error: any, deviceConfig?: ConfigHandler.DeviceConfiguration) => void)
{
    var deviceConfig: ConfigHandler.DeviceConfiguration;

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
            if (error)
                console.log('beforeWorker: DONE, error: ', error.toString());

            cb(error, deviceConfig);
        }
    );
}


export function initTests(cb: () => void)
{
    // Create a "pac-device" device configuration.
    var deviceConfig = createDeviceConfig('deviceId0', TestSettings.pacAddress, TestSettings.useHttps,
        TestSettings.pacKeyId, TestSettings.pacKeyValue);

    ConfigHandler.controllerConnections.createControllerConnection(deviceConfig.address,
        deviceConfig.protocol.toLowerCase() !== 'http',
        deviceConfig.credentials.key, deviceConfig.credentials.secret,
        null, null, 'REJECT_NEW', deviceConfig.id, true);

    let controllerConnection = ConfigHandler.controllerConnections.getController(deviceConfig.id);

    should.exist(controllerConnection);

    InputNodeHandler.setRED(RED);
    ReadNodeHandler.setRED(RED);
    WriteNodeHandler.setRED(RED);
    ConfigHandler.setRED(RED);

    RED.nodes.addCredentials('deviceId0', deviceConfig.credentials);

    controllerConnection.ctrl.getDeviceType(undefined, () =>
    {
        cb();
    });

    return deviceConfig;
}

export function createDeviceConfig(deviceId: string, address: string, useHttps: boolean,
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


export function createDeviceConfigNode(deviceConfig: ConfigHandler.DeviceConfiguration): MockNode.MockNode
{
    var newNode = new MockDeviceNode(deviceConfig.id, deviceConfig.address, deviceConfig.credentials);
    RED.nodes.addNode(newNode);

    return newNode; 
}

export function assertRead(deviceConfig: ConfigHandler.DeviceConfiguration, tagDataType: string, tagName: string,
    value: any, done?: () => any, doFround?: boolean)
{
    testReadNode(deviceConfig, tagDataType, tagName, (msg: any) =>
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

export function assertWrite(deviceConfig: ConfigHandler.DeviceConfiguration, tagDataType: string, tagName: string,
    valueType: string, valueProperty, valueObj: any, value: any, done?: () => any)
{
    testWriteNode(deviceConfig, tagDataType, tagName, valueType, valueProperty, valueObj,
        (msg: any) =>
        {
            should(msg.body.errorCode).equal(0);

            // Do a Read to vefify the Write.
            assertRead(deviceConfig, tagDataType, tagName, value, done);
        });

}


export function testReadNode(deviceConfig: ConfigHandler.DeviceConfiguration, dataType: string, tagName: string,
    responseCallback: (msg: any) => void, msg?: any, valueType?: string,
    valueProperty?: string, topicType?: string, topicProperty?: string): any
{
    // Create a node's configuration.
    var nodeConfig = {
        "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
        "type": "pac-read",
        "device": deviceConfig.id,
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

export function testReadNodeError(deviceConfig: ConfigHandler.DeviceConfiguration, dataType: string, tagName: string,
    msg: any | undefined, errorCallback: (errorText: any, nodeMessage: any) => void): any
{
    // Create a node's configuration.
    var nodeConfig = {
        "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
        "type": "pac-read",
        "device": deviceConfig.id,
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

export function testWriteNode(deviceConfig: ConfigHandler.DeviceConfiguration, dataType: string, tagName: string, valueType: string,
    valueProperty, msg: any, responseCallback: (msg: any) => void): any
{
    // Create a node's configuration.
    var nodeConfig = {
        "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
        "type": "pac-write",
        "device": deviceConfig.id,
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

export function testWriteNodeError(deviceConfig: ConfigHandler.DeviceConfiguration,
    dataType: string, tagName: string,
    valueType: string, valueProperty, msg: any,
    errorCallback: (errorText: any, nodeMessage: any) => void): any
{
    // Create a node's configuration.
    var nodeConfig = {
        "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
        "type": "pac-write",
        "device": deviceConfig.id,
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

export function delayed(done)
{
    // Intentionally delay so that the TCP reset from the controller will not cause problems
    // in the next request.
    setTimeout(() =>
    {
        done(); // Tell Mocha that we're done.
    }, 100);
}



export function createFullInputNode(deviceId: string,
    nodeConfigPartial: Partial<InputNodeHandler.NodeInputConfiguration>,
    onSendCallback: (msg: any) => void,
    onErrorCallback?: (errorText: string, nodeMessage: any) => void)
{

    // Create a node's configuration.
    var nodeConfig: InputNodeHandler.NodeInputConfiguration = {
        id: "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
        type: 'pac-input',
        device: deviceId,
        dataType: nodeConfigPartial.dataType || 'int32-variable',
        tagName: nodeConfigPartial.tagName || '',
        tableStartIndex: nodeConfigPartial.tableStartIndex || '0',
        tableLength: nodeConfigPartial.tableLength || '1',
        sendInitialValue: nodeConfigPartial.sendInitialValue || false,
        deadband: nodeConfigPartial.deadband || '1',
        scanTimeSec: nodeConfigPartial.scanTimeSec || '1',
        name: nodeConfigPartial.name || ''
    };

    var node = new MockPacInputNode(onSendCallback, onErrorCallback);

    var nodeImpl = InputNodeHandler.createSnapPacInputNode.call(node, nodeConfig, true);

    return { node, nodeImpl };
}