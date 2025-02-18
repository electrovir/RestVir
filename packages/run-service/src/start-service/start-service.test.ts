/* eslint-disable sonarjs/no-commented-code */

import {assert} from '@augment-vir/assert';
import {HttpMethod, HttpStatus, mergeDeep} from '@augment-vir/common';
import {runShellCommand} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {defineService, fetchEndpoint, mapServiceDevPort} from '@rest-vir/define-service';
import {
    mockService,
    mockWebsiteOrigin,
} from '@rest-vir/define-service/src/service/define-service.mock.js';
import {buildUrl} from 'url-vir';
import {condenseResponse} from '../test/test-service.js';
import {startService} from './start-service.js';
import {describeServiceScript, getMockScriptCommand} from './test-start-service.mock.js';

describe(startService.name, () => {
    describeServiceScript('single-thread', ({it}) => {
        it('accepts a valid socket message', async ({connectWebSocket}) => {
            const webSocket = await connectWebSocket(
                mockService.webSockets['/no-client-data'].path,
            );
            const serverMessage = await webSocket.sendAndWaitForReply();

            assert.strictEquals(serverMessage, 'ok');
        });
        it('can be dev port scanned', async ({address}) => {
            const service = await mapServiceDevPort(
                defineService({
                    ...mockService.init,
                    serviceOrigin: 'http://localhost:2990',
                }),
            );

            assert.strictEquals(service.serviceOrigin, address);
            assert.strictEquals(service.serviceOrigin, 'http://localhost:3000');
        });
        it('fires websocket listeners', async ({connectWebSocket}) => {
            const webSocket = await connectWebSocket(
                mockService.webSockets['/with-all-listeners'].path,
            );

            webSocket.send();
        });
        it('handles client message data that should not exist', async ({connectWebSocket}) => {
            const webSocket = await connectWebSocket(
                mockService.webSockets['/no-client-data'].path,
            );

            webSocket.send('something here');
        });
        it('rejects invalid WebSocket protocols', async ({connectWebSocket}) => {
            await assert.throws(
                () => connectWebSocket(mockService.webSockets['/required-protocols'].path),
                {
                    matchMessage: 'WebSocket connection failed',
                },
            );
        });
        it('receives web socket protocols', async ({connectWebSocket}) => {
            const mockProtocols = [
                'hi',
                'hi1',
                'hi2',
            ];

            const webSocket = await connectWebSocket(
                mockService.webSockets['/sends-protocol'].path,
                mockProtocols,
            );

            const serverMessage = await webSocket.sendAndWaitForReply();

            assert.deepEquals(serverMessage, mockProtocols);
        });
        it('rejects invalid WebSocket search params', async ({connectWebSocket}) => {
            await assert.throws(
                () => connectWebSocket(mockService.webSockets['/with-search-params'].path),
                {
                    matchMessage: 'WebSocket connection failed',
                },
            );
        });
        it('accepts valid WebSocket search params', async ({connectWebSocket}) => {
            const mockSearchParams = {
                param1: ['hi'],
                param2: [
                    'a',
                    'b',
                    'c',
                ],
            };

            const webSocket = await connectWebSocket(
                buildUrl(mockService.webSockets['/with-search-params'].path, {
                    search: mockSearchParams,
                }).href,
            );

            const serverMessage = await webSocket.sendAndWaitForReply();

            assert.deepEquals(serverMessage, mockSearchParams);
        });
        it('errors on invalid response', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(
                        mockService.endpoints['/incorrectly-has-response-data'].path,
                        {
                            method: HttpMethod.Get,
                        },
                    )
                ).status,
                HttpStatus.InternalServerError,
            );
        });
        it('rejects an unexpected method', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(mockService.endpoints['/test'].path, {
                        method: HttpMethod.Get,
                    })
                ).status,
                HttpStatus.MethodNotAllowed,
            );
        });
        it('passes path params an unexpected method', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await (
                    await fetchEndpoint('/with/first/second', {
                        method: HttpMethod.Get,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                ).json(),
                {
                    param1: 'first',
                    param2: 'second',
                },
            );
        });
        it('does not parse body when content type is not json', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(mockService.endpoints['/test'].path, {
                        method: HttpMethod.Post,
                        body: JSON.stringify({
                            somethingHere: 'value',
                            testValue: 422,
                        } satisfies (typeof mockService.endpoints)['/test']['RequestType']),
                    })
                ).status,
                HttpStatus.BadRequest,
            );
        });
        it('parses body when content type is json', async ({fetchEndpoint}) => {
            const postResponse = await fetchEndpoint(mockService.endpoints['/test'].path, {
                method: HttpMethod.Post,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    somethingHere: 'value',
                    testValue: 422,
                } satisfies (typeof mockService.endpoints)['/test']['RequestType']),
            });

            assert.isTrue(postResponse.ok);
            assert.strictEquals(postResponse.status, HttpStatus.Ok);

            assert.deepEquals(await postResponse.json(), {
                result: 4,
                requestData: {
                    somethingHere: 'value',
                    testValue: 422,
                },
            });
        });
        it('rejects a missing origin when CORS is required', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (await fetchEndpoint(mockService.endpoints['/requires-origin'].path)).status,
                HttpStatus.Forbidden,
            );
        });
        it('rejects invalid endpoint search params', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (await fetchEndpoint(mockService.endpoints['/with-search-params'].path)).status,
                HttpStatus.BadRequest,
            );
        });
        it('accepts valid endpoint search params', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(
                        buildUrl(mockService.endpoints['/with-search-params'].path, {
                            search: {
                                param1: ['hi'],
                                param2: [
                                    'a',
                                    'b',
                                    'c',
                                ],
                            },
                        }).href,
                    )
                ).status,
                HttpStatus.Ok,
            );
        });
        it('accepts endpoint with same path as WebSocket and non-get method', async ({
            fetchEndpoint,
        }) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(
                        buildUrl(mockService.endpoints['/with-search-params'].path, {
                            search: {
                                param1: ['hi'],
                                param2: [
                                    'a',
                                    'b',
                                    'c',
                                ],
                            },
                        }).href,
                        {
                            method: HttpMethod.Post,
                        },
                    )
                ).status,
                HttpStatus.Ok,
            );
        });
        it('accepts endpoint with extra body data', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(mockService.endpoints['/test'].path, {
                        method: HttpMethod.Post,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            somethingHere: 'a',
                            testValue: -4,
                            extraValue: 'hi',
                        }),
                    })
                ).status,
                HttpStatus.Ok,
            );
        });
        it('rejects fetch to WebSocket path', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(mockService.webSockets['/no-client-data'].path, {
                        method: HttpMethod.Get,
                    })
                ).status,
                HttpStatus.NotFound,
            );
        });
        it('passes a matching CORS origin', async ({fetchEndpoint}) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(mockService.endpoints['/requires-origin'].path, {
                        headers: {
                            origin: mockWebsiteOrigin,
                        },
                    })
                ).status,
                HttpStatus.Ok,
                'should accept matching origin',
            );
        });
        it("allows options requests even when the endpoint doesn't specify it", async ({
            fetchEndpoint,
        }) => {
            assert.strictEquals(
                (
                    await fetchEndpoint(mockService.endpoints['/test'].path, {
                        method: HttpMethod.Options,
                    })
                ).status,
                HttpStatus.NoContent,
                'options should be allowed without content',
            );
        });
        it('gets blocked', async ({fetchEndpoint}) => {
            const startTime = Date.now();
            const longRunningTime = fetchEndpoint(mockService.endpoints['/long-running'].path).then(
                () => Date.now() - startTime,
            );
            const plainTime = fetchEndpoint(mockService.endpoints['/plain'].path).then(
                () => Date.now() - startTime,
            );

            assert.isAtLeast(await plainTime, await longRunningTime);
        });
        it('handles function CORS requirements', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/function-origin'].path, {
                        method: HttpMethod.Get,
                        headers: {
                            origin: 'https://electrovir.com',
                        },
                    }),
                ),
                {
                    status: HttpStatus.Forbidden,
                    headers: {},
                },
                'blocks an invalid origin with functions',
            );
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/function-origin'].path, {
                        method: HttpMethod.Get,
                        headers: {
                            origin: 'https://example.com',
                        },
                    }),
                ),
                {
                    status: HttpStatus.Ok,
                    headers: {
                        'access-control-allow-credentials': 'true',
                        'access-control-allow-origin': 'https://example.com',
                        vary: 'Origin',
                    },
                },
                'accepts a valid origin with functions',
            );
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/function-origin'].path, {
                        method: HttpMethod.Options,
                        headers: {
                            origin: 'https://electrovir.com',
                        },
                    }),
                ),
                {
                    status: HttpStatus.NoContent,
                    headers: {},
                },
                'blocks an invalid OPTIONS origin with functions',
            );
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/function-origin'].path, {
                        method: HttpMethod.Options,
                        headers: {
                            origin: 'https://example.com',
                        },
                    }),
                ),
                {
                    status: HttpStatus.NoContent,
                    headers: {
                        'access-control-allow-credentials': 'true',
                        'access-control-allow-headers': 'Cookie,Authorization,Content-Type',
                        'access-control-allow-methods': 'GET',
                        'access-control-allow-origin': 'https://example.com',
                        'access-control-max-age': '3600',
                        vary: 'Origin',
                    },
                },
                'accepts a valid OPTIONS origin with functions',
            );
        });
        it('handles array CORS requirements', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/array-origin'].path, {
                        method: HttpMethod.Get,
                        headers: {
                            origin: 'https://wikipedia.org',
                        },
                    }),
                ),
                {
                    status: HttpStatus.Forbidden,
                    headers: {},
                },
                'blocks an invalid origin with an array',
            );
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/array-origin'].path, {
                        method: HttpMethod.Get,
                        headers: {
                            origin: 'https://example.com',
                        },
                    }),
                ),
                {
                    status: HttpStatus.Ok,
                    headers: {
                        'access-control-allow-credentials': 'true',
                        'access-control-allow-origin': 'https://example.com',
                        vary: 'Origin',
                    },
                },
                'accepts a valid origin with an array',
            );
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/array-origin'].path, {
                        method: HttpMethod.Options,
                        headers: {
                            origin: 'https://wikipedia.org',
                        },
                    }),
                ),
                {
                    status: HttpStatus.NoContent,
                    headers: {},
                },
                'blocks an invalid OPTIONS origin with an array',
            );
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/array-origin'].path, {
                        method: HttpMethod.Options,
                        headers: {
                            origin: 'https://example.com',
                        },
                    }),
                ),
                {
                    status: HttpStatus.NoContent,
                    headers: {
                        'access-control-allow-credentials': 'true',
                        'access-control-allow-headers': 'Cookie,Authorization,Content-Type',
                        'access-control-allow-methods': 'GET',
                        'access-control-allow-origin': 'https://example.com',
                        'access-control-max-age': '3600',
                        vary: 'Origin',
                    },
                },
                'accepts a valid OPTIONS origin with an array',
            );
        });
        it("accepts a service's AnyOrigin", async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/health'].path, {
                        method: HttpMethod.Get,
                    }),
                ),
                {
                    status: HttpStatus.Ok,
                    headers: {
                        'access-control-allow-origin': '*',
                    },
                },
                'accepts a get request without any origin',
            );
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/health'].path, {
                        method: HttpMethod.Options,
                    }),
                ),
                {
                    status: HttpStatus.NoContent,
                    headers: {
                        'access-control-allow-headers': 'Cookie,Authorization,Content-Type',
                        'access-control-allow-methods': 'GET',
                        'access-control-allow-origin': '*',
                        'access-control-max-age': '3600',
                    },
                },
                'accepts an options request without any origin',
            );
        });
        it('generates an error response', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/returns-response-error'].path, {
                        method: HttpMethod.Get,
                    }),
                ),
                {
                    status: HttpStatus.NotAcceptable,
                    body: 'INTENTIONAL ERROR',
                    headers: {
                        'access-control-allow-origin': '*',
                        /** This header is automatically added by fastify. */
                        'content-type': 'text/plain; charset=utf-8',
                    },
                },
            );
        });
        it('handles a context rejection', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/empty'].path, {
                        method: HttpMethod.Get,
                        headers: {
                            authorization: 'reject',
                        },
                    }),
                ),
                {
                    status: HttpStatus.Unauthorized,
                    headers: {
                        'access-control-allow-origin': '*',
                    },
                },
            );
        });
        it('handles failed context generation', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/empty'].path, {
                        method: HttpMethod.Get,
                        headers: {
                            authorization: 'error',
                        },
                    }),
                ),
                {
                    status: HttpStatus.InternalServerError,
                    headers: {
                        'access-control-allow-origin': '*',
                    },
                },
            );
        });
        it('rejects unexpected request body', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/plain'].path, {
                        method: HttpMethod.Post,
                        body: JSON.stringify({somethingHere: 'hi'}),
                        headers: {
                            'content-type': 'application/json',
                        },
                    }),
                ),
                {
                    status: HttpStatus.BadRequest,
                    body: 'Invalid body.',
                    headers: {
                        'access-control-allow-origin': '*',
                        'content-type': 'text/plain; charset=utf-8',
                    },
                },
            );
        });
        it('404s on missing endpoint', async ({fetchEndpoint}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchEndpoint(mockService.endpoints['/missing'].path, {
                        method: HttpMethod.Get,
                    }),
                ),
                {
                    status: 404,
                    body: '{"message":"Route GET:/missing not found","error":"Not Found","statusCode":404}',
                    headers: {
                        'content-type': 'application/json; charset=utf-8',
                    },
                },
            );
        });
        it('works with fetchEndpoint', async ({address}) => {
            const output = await fetchEndpoint(
                mergeDeep(mockService.endpoints['/empty'], {
                    service: {
                        serviceOrigin: address,
                    },
                }),
            );

            assert.isUndefined(output.data);

            assert.deepEquals(await condenseResponse(output.response), {
                status: HttpStatus.Ok,
                headers: {
                    'access-control-allow-origin': '*',
                },
            });
        });
    });

    describeServiceScript('multi-threaded', ({it}) => {
        /**
         * Unfortunately this test is not reliable as an automated test. Instead, test it manually
         * by doing the following:
         *
         * 1. Run `npx tsx <path-to-multithreaded-script-file>`.
         * 2. Hit the `/long-running` endpoint in a browser.
         * 3. Quickly, in a separate tab, open `/empty`.
         * 4. `/empty` should resolve immediately while `/long-running` is still loading.
         */
        // it('does not get blocked', async ({fetchEndpoint}) => {
        //     const startTime = Date.now();
        //     const longRunningTime = fetchEndpoint(
        //         mockService.endpoints['/long-running'].path,
        //     ).then(() => Date.now() - startTime);
        //     const plainTime = fetchEndpoint(mockService.endpoints['/plain'].path).then(
        //         () => Date.now() - startTime,
        //     );
        //     assert.isBelow(await plainTime, await longRunningTime);
        // });
        it('runs', async ({fetchEndpoint}) => {
            const response = await fetchEndpoint(mockService.endpoints['/empty'].path);
            assert.deepEquals(await condenseResponse(response), {
                headers: {
                    'access-control-allow-origin': '*',
                },
                status: HttpStatus.Ok,
            });
        });
    });
    describeServiceScript('locked-port', ({it}) => {
        it('locks the port number', ({address}) => {
            assert.strictEquals(address, 'http://localhost:3789');
        });
    });

    it('kills workers and exits automatically', async () => {
        assert.strictEquals(
            (await runShellCommand(getMockScriptCommand('kill-workers'))).exitCode,
            0,
        );
    });
    it('kills the cluster', async () => {
        assert.strictEquals(
            (await runShellCommand(getMockScriptCommand('kill-cluster'))).exitCode,
            0,
        );
    });
});
