import {assert} from '@augment-vir/assert';
import {HttpMethod, HttpStatus, mergeDeep} from '@augment-vir/common';
import {runShellCommand} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {fetchEndpoint} from '@rest-vir/define-service';
import {
    mockService,
    mockWebsiteOrigin,
} from '@rest-vir/define-service/src/service/define-service.mock.js';
import {condenseResponse} from '../test/test-service.js';
import {startService} from './start-service.js';
import {describeServiceScript, getMockScriptCommand} from './test-start-service.mock.js';

describe(startService.name, () => {
    describeServiceScript('single-thread', ({it}) => {
        it('rejects an unexpected method', async ({fetchService}) => {
            assert.strictEquals(
                (
                    await fetchService(mockService.endpoints['/test'].path, {
                        method: HttpMethod.Get,
                    })
                ).status,
                HttpStatus.MethodNotAllowed,
            );
        });
        it('does not parse body when content type is not json', async ({fetchService}) => {
            assert.strictEquals(
                (
                    await fetchService(mockService.endpoints['/test'].path, {
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
        it('parses body when content type is json', async ({fetchService}) => {
            const postResponse = await fetchService(mockService.endpoints['/test'].path, {
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
        it('rejects a missing origin when CORS is required', async ({fetchService}) => {
            assert.strictEquals(
                (await fetchService(mockService.endpoints['/requires-origin'].path)).status,
                HttpStatus.Forbidden,
            );
        });
        it('passes a matching CORS origin', async ({fetchService}) => {
            assert.strictEquals(
                (
                    await fetchService(mockService.endpoints['/requires-origin'].path, {
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
            fetchService,
        }) => {
            assert.strictEquals(
                (
                    await fetchService(mockService.endpoints['/test'].path, {
                        method: HttpMethod.Options,
                    })
                ).status,
                HttpStatus.NoContent,
                'options should be allowed without content',
            );
        });
        it('gets blocked', async ({fetchService}) => {
            const startTime = Date.now();
            const longRunningTime = fetchService(mockService.endpoints['/long-running'].path).then(
                () => Date.now() - startTime,
            );
            const plainTime = fetchService(mockService.endpoints['/plain'].path).then(
                () => Date.now() - startTime,
            );

            assert.isAtLeast(await plainTime, await longRunningTime);
        });
        it('handles function CORS requirements', async ({fetchService}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchService(mockService.endpoints['/function-origin'].path, {
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
                    await fetchService(mockService.endpoints['/function-origin'].path, {
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
                    await fetchService(mockService.endpoints['/function-origin'].path, {
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
                    await fetchService(mockService.endpoints['/function-origin'].path, {
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
        it('handles array CORS requirements', async ({fetchService}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchService(mockService.endpoints['/array-origin'].path, {
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
                    await fetchService(mockService.endpoints['/array-origin'].path, {
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
                    await fetchService(mockService.endpoints['/array-origin'].path, {
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
                    await fetchService(mockService.endpoints['/array-origin'].path, {
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
        it("accepts a service's AnyOrigin", async ({fetchService}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchService(mockService.endpoints['/health'].path, {
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
                    await fetchService(mockService.endpoints['/health'].path, {
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
        it('generates an error response', async ({fetchService}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchService(mockService.endpoints['/returns-response-error'].path, {
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
        it('rejects unexpected request body', async ({fetchService}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchService(mockService.endpoints['/plain'].path, {
                        method: HttpMethod.Post,
                        body: JSON.stringify({somethingHere: 'hi'}),
                        headers: {
                            'content-type': 'application/json',
                        },
                    }),
                ),
                {
                    status: HttpStatus.BadRequest,
                    headers: {
                        'access-control-allow-origin': '*',
                    },
                },
            );
        });
        it('404s on missing endpoint', async ({fetchService}) => {
            assert.deepEquals(
                await condenseResponse(
                    await fetchService(mockService.endpoints['/missing'].path, {
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
        // it('does not get blocked', async ({fetchService}) => {
        //     const startTime = Date.now();
        //     const longRunningTime = fetchService(
        //         mockService.endpoints['/long-running'].path,
        //     ).then(() => Date.now() - startTime);
        //     const plainTime = fetchService(mockService.endpoints['/plain'].path).then(
        //         () => Date.now() - startTime,
        //     );
        //     assert.isBelow(await plainTime, await longRunningTime);
        // });
        it('runs', async ({fetchService}) => {
            const response = await fetchService(mockService.endpoints['/empty'].path);
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
