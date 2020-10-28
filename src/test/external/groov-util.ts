import localVarRequest = require('request');
import http = require('http');
import https = require('https');
import * as Promise from 'bluebird';

export interface PromiseResponse
{
    response: http.ClientResponse;
    body: any; // Since we don't do anything much with the response bodies, we can ignore the type.
}

export class UserFullData
{
    username: string;
    apiKey: string;
    email: string;
    isAdmin: boolean;
    sessionExpires: boolean;
    canLogout: boolean;
    requirePasswordReset: boolean;
    manageAppPermission: string;
    groovAppPermission: string;
    nodeRedPermission: string;
    pacRestApiPermission: string;
    secureMmpApiPermission: string;
    dbId?: string;
    rowId?: number;
    sessions?: Array<any>;
    pwdHash?: string;
}

export class GroovUtil
{
    static getUserData(address: string, username: string, password: string):
        Promise<{ response: http.ClientResponse; body: UserFullData }>
    {

        let localVarRequestOptions: localVarRequest.Options = {
            method: 'POST',
            qs: {},
            headers: {},
            uri: 'https://' + address + '/auth/access/user/login',
            useQuerystring: false,
            json: true,
            body: {
                username: username,
                password: password
            }
        };

        // We don't have the certificates yet, so don't freak out about HTTPS.
        (<https.ServerOptions>localVarRequestOptions).rejectUnauthorized = false;

        localVarRequestOptions.forever = true;
        // localVarRequestOptions.agent = this.httpsAgent;
        localVarRequestOptions.timeout = 15000;

        return new Promise<{ response: http.ClientResponse; body: UserFullData; }>((resolve, reject) =>
        {
            localVarRequest(localVarRequestOptions, (error, response, body) =>
            {
                if (error) {
                    reject(error);
                } else {
                    if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                        
                        // First resolve the response
                        resolve({ response: response, body: body });

                        // TODO: replace this with a cookie-based request. The API Key
                        // won't work for logging out a session.
                        //
                        // Then log out the user's session. Not really needed for the test, but keeps
                        // the list of sessions to a minimum on the device.
                        // Ignore responses.
                        // GroovUtil.logoutUser(address, body.apiKey).then(
                        //     (fullfilledResponse: PromiseResponse) => { },
                        //     (error: any) => { 
                        //         console.error(console.log('Could not log out user, error = ' + JSON.stringify(error, undefined, 2)));
                        //     }
                        // );
                    } else {
                        reject({ response: response, body: body });
                    }
                }
            });
        });
    }

    static logoutUser(address: string, apiKey: string):
        Promise<{ response: http.ClientResponse; body: UserFullData }>
    {

        let localVarRequestOptions: localVarRequest.Options = {
            method: 'PUT',
            qs: {},
            headers: {
                apiKey: apiKey
            },
            uri: 'https://' + address + '/auth/access/user/logout',
            useQuerystring: false
        };

        // We don't have the certificates yet, so don't freak out about HTTPS.
        (<https.ServerOptions>localVarRequestOptions).rejectUnauthorized = false;

        localVarRequestOptions.forever = true;
        // localVarRequestOptions.agent = this.httpsAgent;
        localVarRequestOptions.timeout = 15000;

        return new Promise<{ response: http.ClientResponse; body: UserFullData; }>((resolve, reject) =>
        {
            localVarRequest(localVarRequestOptions, (error, response, body) =>
            {
                if (error) {
                    reject(error);
                } else {
                    if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                        resolve({ response: response, body: body });
                    } else {
                        reject({ response: response, body: body });
                    }
                }
            });
        });
    }
}