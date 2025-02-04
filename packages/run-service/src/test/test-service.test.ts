import {assert} from '@augment-vir/assert';
import {DeferredPromise, randomInteger} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin, defineService, HttpMethod, HttpStatus} from '@rest-vir/define-service';
import {implementService} from '@rest-vir/implement-service';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {exact} from 'object-shape-tester';
import {condenseResponse, describeService, testService} from './test-service.js';

describeService({service: mockServiceImplementation}, ({fetchService}) => {
    it('responds to a request', async () => {
        const response = await fetchService['/empty']();

        assert.isTrue(response.ok);
    });
    it('rejects an invalid request', async () => {
        const response = await fetchService['/test']({
            // @ts-expect-error: invalid request data
            requestData: undefined,
        });

        assert.isFalse(response.ok);
    });
});

const plainService = implementService(
    {
        service: defineService({
            sockets: {
                '/socket': {
                    messageFromClientShape: exact('from client'),
                    messageFromServerShape: exact('from server'),
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
            },
            requiredOrigin: AnyOrigin,
            serviceName: 'plain service',
            serviceOrigin: 'https://example.com',
        }),
    },
    {
        endpoints: {
            '/health'({context}) {
                assert.tsType(context).equals<undefined>();

                return {
                    statusCode: HttpStatus.Ok,
                };
            },
        },
        sockets: {
            '/socket': {
                onMessage({message, webSocket}) {
                    assert.strictEquals(message, 'from client');
                    webSocket.send('from server');
                },
            },
        },
    },
);

describeService({service: plainService, options: {}}, ({fetchService}) => {
    it('responds to a request', async () => {
        const response = await fetchService['/health']();

        assert.isTrue(response.ok);
    });
    it('includes fastify headers', async () => {
        const response = await fetchService['/health']();

        assert.hasKeys((await condenseResponse(response, {includeFastifyHeaders: true})).headers, [
            'access-control-allow-origin',
            'connection',
            'content-length',
            'date',
        ]);
    });
});

describe(testService.name, () => {
    it('works with an actual port', async () => {
        const {fetchService, connectSocket, kill} = await testService(plainService, {
            port: 4500 + randomInteger({min: 0, max: 4000}),
        });

        try {
            assert.deepEquals(await condenseResponse(await fetchService['/health']()), {
                headers: {
                    'access-control-allow-origin': '*',
                },
                status: HttpStatus.Ok,
            });

            const socketMessageReceived = new DeferredPromise<string>();

            const socket = await connectSocket['/socket']({
                listeners: {
                    message({message}) {
                        socketMessageReceived.resolve(message);
                    },
                },
            });
            try {
                socket.send('from client');

                const messageReceived = await socketMessageReceived.promise;

                assert.strictEquals(messageReceived, 'from server');
            } finally {
                socket.close();
            }
        } finally {
            kill();
        }
    });
});
