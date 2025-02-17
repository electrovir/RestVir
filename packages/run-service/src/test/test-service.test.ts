import {assert, waitUntil} from '@augment-vir/assert';
import {DeferredPromise, randomInteger} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin, defineService, HttpMethod, HttpStatus} from '@rest-vir/define-service';
import {implementService} from '@rest-vir/implement-service';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import fastify from 'fastify';
import {exact} from 'object-shape-tester';
import {
    condenseResponse,
    describeService,
    testExistingServer,
    testService,
} from './test-service.js';

describeService({service: mockServiceImplementation}, ({fetchEndpoint}) => {
    it('responds to a request', async () => {
        const response = await fetchEndpoint['/empty']();

        assert.isTrue(response.ok);
    });
    it('rejects an invalid request', async () => {
        const response = await fetchEndpoint['/test']({
            // @ts-expect-error: invalid request data
            requestData: undefined,
        });

        assert.isFalse(response.ok);
    });
});

const plainService = implementService(
    {
        service: await defineService({
            webSockets: {
                '/socket': {
                    messageFromClientShape: exact('from client'),
                    messageFromHostShape: exact('from server'),
                },
            },
            endpoints: {
                '/health': {
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                    requestDataShape: undefined,
                    responseDataShape: undefined,
                },
                '/internal-error': {
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                    requestDataShape: undefined,
                    responseDataShape: undefined,
                },
            },
            requiredClientOrigin: AnyOrigin,
            serviceName: 'plain service',
            serviceOrigin: 'https://example.com',
        }),
        createContext({requestHeaders}) {
            if (requestHeaders.authorization === 'reject') {
                throw new Error('context failed');
            }

            return {
                context: undefined,
            };
        },
    },
    {
        endpoints: {
            '/health'({context}) {
                assert.tsType(context).equals<undefined>();

                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            '/internal-error'() {
                throw new Error('Intentional error.');
            },
        },
        webSockets: {
            '/socket': {
                onMessage({message, webSocket}) {
                    assert.strictEquals(message, 'from client');
                    webSocket.send('from server');
                },
            },
        },
    },
);

describeService({service: plainService, options: {}}, ({fetchEndpoint}) => {
    it('responds to a request', async () => {
        const response = await fetchEndpoint['/health']();

        assert.isTrue(response.ok);
    });
    it('includes fastify headers', async () => {
        const response = await fetchEndpoint['/health']();

        assert.hasKeys((await condenseResponse(response, {includeDefaultHeaders: true})).headers, [
            'access-control-allow-origin',
            'connection',
            'content-length',
            'date',
        ]);
    });
});

describe(testService.name, () => {
    it('works with an actual port', async () => {
        const {fetchEndpoint, connectWebSocket, kill} = await testService(plainService, {
            port: 4500 + randomInteger({min: 0, max: 4000}),
        });

        try {
            assert.deepEquals(await condenseResponse(await fetchEndpoint['/health']()), {
                headers: {
                    'access-control-allow-origin': '*',
                },
                status: HttpStatus.Ok,
            });

            const webSocketMessageReceived = new DeferredPromise<string>();

            const webSocket = await connectWebSocket['/socket']({
                listeners: {
                    message({message}) {
                        webSocketMessageReceived.resolve(message);
                    },
                },
            });
            try {
                const reply = await webSocket.sendAndWaitForReply({message: 'from client'});
                assert.tsType(reply).equals<'from server'>();
                assert.strictEquals(reply, 'from server');
                webSocket.send('from client');

                const messageReceived = await webSocketMessageReceived.promise;

                assert.strictEquals(messageReceived, 'from server');
            } finally {
                webSocket.close();
            }
        } finally {
            await kill();
        }
    });
    it('works without a port', async () => {
        const {fetchEndpoint, connectWebSocket, kill} = await testService(plainService);

        try {
            assert.deepEquals(await condenseResponse(await fetchEndpoint['/health']()), {
                headers: {
                    'access-control-allow-origin': '*',
                },
                status: HttpStatus.Ok,
            });

            const webSocketMessageReceived = new DeferredPromise<string>();

            const webSocket = await connectWebSocket['/socket']({
                listeners: {
                    message({message}) {
                        webSocketMessageReceived.resolve(message);
                    },
                },
            });
            try {
                const reply = await webSocket.sendAndWaitForReply({message: 'from client'});
                assert.tsType(reply).equals<'from server'>();
                assert.strictEquals(reply, 'from server');
                webSocket.send('from client');

                const messageReceived = await webSocketMessageReceived.promise;

                assert.strictEquals(messageReceived, 'from server');
            } finally {
                webSocket.close();
            }
        } finally {
            await kill();
        }
    });
});

describe(testExistingServer.name, () => {
    it('works with an existing fastify instance', async () => {
        const server = fastify();

        const errors: string[] = [];

        server.setErrorHandler((error, request, reply) => {
            errors.push(error.message);
            reply.status(HttpStatus.InternalServerError).send();
        });

        const {fetchEndpoint} = await testExistingServer(server, plainService, {
            throwErrorsForExternalHandling: true,
        });
        try {
            assert.deepEquals(
                await condenseResponse(await fetchEndpoint['/health']()),
                {
                    headers: {
                        'access-control-allow-origin': '*',
                    },
                    status: HttpStatus.Ok,
                },
                'should work with a simple request',
            );

            assert.isFalse((await fetchEndpoint['/internal-error']()).ok);

            await waitUntil.isLengthExactly(1, () => errors);

            assert.strictEquals(
                errors[0],
                "Endpoint '/internal-error' failed in service 'plain service': Intentional error.",
            );
            assert.isFalse(
                (
                    await fetchEndpoint['/health']({
                        options: {
                            headers: {
                                authorization: 'reject',
                            },
                        },
                    })
                ).ok,
            );

            await waitUntil.isLengthExactly(2, () => errors);

            assert.strictEquals(errors[1], 'Failed to generate request context: context failed');
        } finally {
            await server.close();
        }
    });
});
