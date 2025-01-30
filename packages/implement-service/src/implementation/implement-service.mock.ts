/* node:coverage disable */

import {assert, check} from '@augment-vir/assert';
import {HttpStatus, wait, type AnyObject} from '@augment-vir/common';
import {mockService, MyMockAuth} from '@rest-vir/define-service/src/service/define-service.mock';
import {implementService} from './implement-service.js';

export type MockServiceContext = {
    date: number;
};

export const mockServiceImplementation = implementService(
    mockService,
    {
        context(): MockServiceContext {
            return {
                date: Date.now(),
            };
        },
        extractAuth({request}) {
            const naiveAuth = request.headers.authorization;

            if (check.isEnumValue(naiveAuth, MyMockAuth)) {
                return naiveAuth;
            } else {
                return undefined;
            }
        },
    },
    {
        sockets: {
            '/no-data': {
                onMessage(params) {
                    assert.tsType(params.context).equals<MockServiceContext>();
                    assert.tsType(params.message).equals<undefined>();
                    assert.tsType<'message'>().matches<keyof typeof params>();
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
