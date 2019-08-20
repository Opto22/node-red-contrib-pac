import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

import * as async from 'async';

import { stringify } from 'querystring';

export interface ResponseCallback
{
    (error: any, responseCode?: number, responseContent?: Buffer): void;
}

export class OptoHost
{
    private client: net.Socket;
    private connecting = false;
    private connected = false;
    private nextDataCb: ResponseCallback;

    constructor(
        private address: string,
        private port: number,
        private logToConsole?: boolean,
        private timeoutMs?: number)
    {
        this.logToConsole = logToConsole || false;
        this.timeoutMs = timeoutMs || 3000;
    }

    public connect(connectCallback: (err?: Error) => void)
    {
        this.connecting = true;

        console.log('net.createConnection() start');
        this.client = net.createConnection(this.port, this.address, () =>
        {
            console.log('net.createConnection() cb');

            this.connecting = false;
            this.connected = true;

            if (connectCallback)
                connectCallback();
        });

        this.client.on('data', (chunk: Buffer) =>
        {
            if (this.nextDataCb) {
                var nextDataCbCopy = this.nextDataCb;
                this.nextDataCb = undefined;

                var responseCode: number;
                var responseContent: Buffer;

                if (chunk.length >= 2) {
                    responseCode = chunk.readInt16LE(0);
                    responseContent = chunk.slice(2);
                }

                if (responseCode != 0) {
                    console.log('data event: responseCode=' + responseCode +
                        ' responseContent=' + (responseContent && responseContent.toString()));
                }

                nextDataCbCopy(undefined, responseCode, responseContent);
            }
        });

    }


    public close(callback: () => any)
    {
        this.client.on('end', callback);
        this.client.end();
    }

    sendRecvCmd(cmd: string, cb: ResponseCallback)
    {
        // console.log('sendRecvCmd(), cmd=' + cmd);

        this.nextDataCb = cb;

        this.client.write(cmd + '\r', () =>
        {
            //console.log('client.write() cb');
        });
    }

    downloadCdf(cdfPath: string, cb: (err?: any) => void)
    {
        console.log('downloadCdf()');

        this.sendRecvCmd('45.0 AcquireLC',
            (error: any, responseCode?: number, responseContent?: Buffer) =>
            {

                fs.readFile(cdfPath, 'utf8', (error: NodeJS.ErrnoException, data: string) =>
                {

                    if (error)
                        cb(error)
                    else {
                        var lines = data.split(os.EOL);

                        async.eachSeries(lines,
                            (line: string, eachCb: (err: any) => void) =>
                            {
                                // console.log(line);
                                this.sendRecvCmd(line, eachCb);
                            },
                            (err?: any) =>
                            {
                                console.log('err = ' + JSON.stringify(err, undefined, 2));

                                this.sendRecvCmd('ReleaseLC', (releaseLcError: any) =>
                                {
                                    // Add a short delay.
                                    setTimeout(() =>
                                    {
                                        cb(err || releaseLcError);
                                    }, 500);
                                });
                            }
                        );
                    }
                })
            });

    }


}

interface DownloadStrategyOptions
{
    run?: boolean;
}

export class PacUtil
{


    static downloadStrategy(address: string, pathCdf: string,
        options: DownloadStrategyOptions,
        cb: (error?: any) => void)
    {
        var client = new OptoHost(address, 22001, true);
        client.connect((err?: Error) =>
        {
            if (err) {
                cb(err);
                return;
            }

            client.sendRecvCmd('A', (error: any, responseCode?: number, responseContent?: Buffer) =>
            {
                // console.log('A response = ', response.toString());

                if (responseCode === 0) {
                    // console.log(response.toString());

                    client.downloadCdf(path.join(process.cwd(), pathCdf),
                        (err: any) =>
                        {
                            if (err) {
                                console.log('downloadStrategy error: ' + err);
                                cb(err);
                            }
                            else {
                                if (options.run) {
                                    client.sendRecvCmd('_RUN', (error: any) =>
                                    {
                                        if (error) {
                                            cb(error);
                                        }
                                        else {
                                            setTimeout(() =>
                                            {
                                                client.close(cb);
                                            }, 1000);
                                        }
                                    });
                                }
                                else {
                                    cb();
                                }
                            }
                        });
                }
            });
        });
    }

}