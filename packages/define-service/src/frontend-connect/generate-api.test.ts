import {assert} from '@augment-vir/assert';
import {HttpStatus, wait} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import type {GenericEndpointDefinition} from '../endpoint/endpoint.js';
import {defineService} from '../service/define-service.js';
import {createMockResponse} from '../util/mock-fetch.js';
import {AnyOrigin} from '../util/origin.js';
import {generateApi, makeMockApi} from './generate-api.js';
import {mockServiceApi} from './generate-api.mock.js';
import {MockClientWebSocket} from './mock-client-web-socket.js';

describe(generateApi.name, () => {
    const testApi = generateApi(
        defineService({
            requiredClientOrigin: AnyOrigin,
            serviceName: 'test-service',
            serviceOrigin: 'localhost:0',
            endpoints: {
                '/test': {
                    methods: {
                        GET: true,
                    },
                    requestDataShape: undefined,
                    responseDataShape: undefined,
                },
            },
            webSockets: {
                '/test': {
                    messageFromClientShape: undefined,
                    messageFromHostShape: undefined,
                },
            },
        }),
    );

    it('sends a fetch', async () => {
        /** This will fail because the service origin is invalid. */
        await assert.throws(() => testApi.endpoints['/test'].fetch());
    });
    it('connects a WebSocket', async () => {
        /** This will fail because the service origin is invalid. */
        await assert.throws(() => testApi.webSockets['/test'].connect());
    });
});

describe(makeMockApi.name, () => {
    const mockMockApi = makeMockApi(mockServiceApi, {
        fetch(url, init, endpoint) {
            assert.tsType(endpoint).matches<GenericEndpointDefinition | undefined>();
            assert
                .tsType(endpoint?.path)
                .equals<
                    | undefined
                    | '/custom-props'
                    | '/function-origin'
                    | '/array-origin'
                    | '/health'
                    | '/test'
                    | '/plain'
                    | '/requires-origin'
                    | '/long-running'
                    | '/with/:param1/:param2'
                    | '/empty'
                    | '/requires-admin'
                    | '/missing'
                    | '/incorrectly-has-response-data'
                    | '/throws-error'
                    | '/returns-response-error'
                    | '/returns-error-status'
                    | '/with-search-params'
                >();
            return createMockResponse({
                status: HttpStatus.Ok,
            });
        },
        webSocketConstructor: MockClientWebSocket,
    });

    it('has proper types', () => {
        assert.tsType(mockServiceApi.endpoints['/with-search-params']).notEquals<never>();
        assert.tsType(mockServiceApi.endpoints['/empty']).notEquals<never>();
        assert
            .tsType<(typeof mockServiceApi.endpoints)['/long-running']['ResponseType']>()
            .equals<Readonly<{result: number}>>();
    });

    it('fetches a mock endpoint', async () => {
        const {data, response} = await mockMockApi.endpoints['/empty'].fetch();

        assert.isTrue(response.ok);
        assert.isUndefined(data);
    });
    it('connects to a mock WebSocket', async () => {
        const webSocket = await mockMockApi.webSockets['/no-client-data'].connect();

        const replyPromise = webSocket.sendAndWaitForReply();

        await wait({milliseconds: 100});

        webSocket.sendFromHost('ok');

        assert.strictEquals(await replyPromise, 'ok');
    });
});
