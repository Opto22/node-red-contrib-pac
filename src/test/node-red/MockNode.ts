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
import *  as should from 'should';

import * as NodeRed from 'opto22-node-red-common/typings/nodered';

export class MockNode implements NodeRed.Node
{
    constructor(type: string, onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        this.type = type;
        this.onSend = onSend;
        this.onError = onError;
    }

    id: string;
    type: string;
    z: string;
    name: string;
    credentials: any;
    onSend: (msg: any) => void;
    onError: (errorText: any, nodeMessage: any) => void;

    on(type: string, callback: (any) => void): void
    {
    }

    public error(errorText: any, nodeMessage: any)
    {
        // By default, fail if we get here. Override the method, if needed.
        if (this.onError) {
            this.onError(errorText, nodeMessage);
        }
        else {
            console.log('Unexpected error: ' + errorText);
            should.equal(true, false); // fail
        }
    }

    public warn(text: string)
    {
        // By default, fail if we get here. Override the method, if needed.
        should.equal(true, false); // fail
    }

    public log(text: string)
    {
    }

    public status(statusObj: any)
    {
        // console.log('node status = ' + JSON.stringify(status));
    }

    public send(nodeMessage: any)
    {
        // "Send" the message to the callback, which is where the bulk of the testing often occurs.
        if (this.onSend) {
            this.onSend(nodeMessage);
        }
    }

}
