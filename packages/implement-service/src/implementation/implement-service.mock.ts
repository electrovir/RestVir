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
        createContext({requestHeaders, endpointDefinition: endpoint}) {
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
        webSockets: {
            '/with-search-params': {
                open({searchParams}) {
                    assert.tsType(searchParams).equals<
                        Readonly<{
                            param1: [string];
                            param2: ReadonlyArray<string>;
                        }>
                    >();
                },
                message({searchParams, webSocket}) {
                    webSocket.send(searchParams);
                },
            },
            '/required-protocols': {
                open({protocols}) {
                    assert.tsType(protocols).equals<[string, string, 'hi']>();
                },
                message({webSocket}) {
                    webSocket.send('ok');
                },
            },
            '/no-server-data': {},
            '/with-all-listeners': {
                close() {
                    log.faint('close called');
                },
                open() {
                    log.faint('connection called');
                },
                message() {
                    log.faint('message called');
                },
            },
            '/sends-protocol': {
                message({protocols, webSocket}) {
                    webSocket.send(protocols);
                },
            },
            '/custom-props-web-socket': {
                message(params) {
                    assert.tsType(params.webSocketDefinition.customProps).equals<{
                        hello: string;
                    }>();
                    params.webSocket.send('ok');
                },
            },
            '/no-client-data': {
                message(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType(params.message).equals<undefined>();
                    assert.isUndefined(params.message);
                    assert.tsType<'message'>().matches<keyof typeof params>();
                    assert.tsType(params.webSocketDefinition.customProps).equals<undefined>();
                    params.webSocket.send('ok');
                },
                close(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
                open(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
            },
            '/no-origin': {
                message(params) {
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
                close(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
                open(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
            },
            '/origin-locked': {
                message(params) {
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
                close(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
                open(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType<'message'>().notMatches<keyof typeof params>();
                },
            },
        },
        endpoints: {
            '/with-search-params'({searchParams}) {
                assert.tsType(searchParams).equals<
                    Readonly<{
                        param1: [string];
                        param2: ReadonlyArray<string>;
                    }>
                >();

                return {
                    statusCode: HttpStatus.Ok,
                };
            },
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
                throw new Error('fake error');
            },
            '/with/:param1/:param2'({pathParams}) {
                assert.tsType(pathParams).equals<
                    Readonly<{
                        param1: string;
                        param2: string;
                    }>
                >();
                return {
                    statusCode: HttpStatus.Accepted,
                    responseData: pathParams,
                };
            },
        },
    },
);

delete (mockServiceImplementation.endpoints as AnyObject)['/missing'];
