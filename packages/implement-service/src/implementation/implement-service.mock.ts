/* node:coverage disable */

import {assert} from '@augment-vir/assert';
import {HttpStatus, log, wait, type AnyObject} from '@augment-vir/common';
import {mockService} from '@rest-vir/define-service/src/service/define-service.mock';
import {implementService} from './implement-service.js';

export type MockServiceContext = {
    date: number;
};

export const mockServiceImplementation = implementService(
    {
        service: mockService,
        createContext({requestHeaders, endpoint}) {
            assert.tsType(endpoint?.customProps).equals<undefined | {somethingElse: string}>();

            if (requestHeaders.authorization === 'reject') {
                return {
                    reject: {
                        statusCode: HttpStatus.Unauthorized,
                    },
                };
            } else if (requestHeaders.authorization === 'error') {
                throw new Error('Context creation failed.');
            } else {
                return {
                    context: {
                        date: Date.now(),
                    },
                };
            }
        },
    },
    {
        sockets: {
            '/no-server-data': {},
            '/with-all-listeners': {
                onClose() {
                    log.faint('close called');
                },
                onConnection() {
                    log.faint('connection called');
                },
                onMessage() {
                    log.faint('message called');
                },
            },
            '/sends-protocol': {
                onMessage({protocols, webSocket}) {
                    webSocket.send(protocols);
                },
            },
            '/custom-props-web-socket': {
                onMessage(params) {
                    assert.tsType(params.socketDefinition.customProps).equals<{
                        hello: string;
                    }>();
                    params.webSocket.send('ok');
                },
            },
            '/no-client-data': {
                onMessage(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType(params.message).equals<undefined>();
                    assert.isUndefined(params.message);
                    assert.tsType<'message'>().matches<keyof typeof params>();
                    assert.tsType(params.socketDefinition.customProps).equals<undefined>();
                    params.webSocket.send('ok');
                },
                onClose(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
                onConnection(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
            },
            '/no-origin': {
                onMessage(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType(params.message).equals<
                        Readonly<{
                            a: string;
                            b: number;
                        }>
                    >();
                    assert.tsType<'message'>().matches<keyof typeof params>();
                    params.webSocket.send('ok');
                },
                onClose(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
                onConnection(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
            },
            '/origin-locked': {
                onMessage(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType(params.message).equals<
                        Readonly<{
                            a: string;
                            b: number;
                        }>
                    >();
                    assert.tsType<'message'>().matches<keyof typeof params>();
                    params.webSocket.send('ok');
                },
                onClose(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
                onConnection(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
            },
        },
        endpoints: {
            // @ts-expect-error: this endpoint is not supposed to return data
            '/incorrectly-has-response-data'() {
                return {
                    statusCode: HttpStatus.Ok,
                    responseData: {data: 'should not be here'},
                };
            },
            '/custom-props'() {
                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            '/array-origin'() {
                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            '/function-origin'() {
                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            '/health'() {
                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            '/requires-origin'() {
                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            '/empty'() {
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: undefined,
                };
            },
            async '/plain'() {
                await wait({milliseconds: 1});

                return {
                    statusCode: HttpStatus.Ok,
                    responseData: {
                        fakeData: 'hi there',
                    },
                };
            },
            async '/long-running'({requestData, context}) {
                assert.tsType(context).equals<MockServiceContext>();

                const max = requestData?.count ?? 5_000_000_000;

                const count = await new Promise<number>((resolve) => {
                    let counter = 0;
                    for (let i = 0; i < max; i++) {
                        counter++;
                    }
                    resolve(counter);
                });

                return {
                    statusCode: HttpStatus.Ok,
                    responseData: {
                        result: count,
                    },
                };
            },
            '/missing'() {
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: undefined,
                };
            },
            '/requires-admin'() {
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: undefined,
                };
            },
            '/returns-error-status'() {
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: undefined,
                };
            },
            '/returns-response-error'() {
                return {
                    statusCode: HttpStatus.NotAcceptable,
                    responseErrorMessage: 'INTENTIONAL ERROR',
                    responseData: undefined,
                };
            },
            '/test'({requestData}) {
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: {
                        requestData,
                        result: 4,
                    },
                };
            },
            '/throws-error'() {
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: undefined,
                };
            },
            '/with/:param1/:param2'() {
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: undefined,
                };
            },
        },
    },
);

delete (mockServiceImplementation.endpoints as AnyObject)['/missing'];
