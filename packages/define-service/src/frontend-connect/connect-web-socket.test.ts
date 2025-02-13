import {assert} from '@augment-vir/assert';
import {wait} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import {
    getOppositeWebSocketLocation,
    WebSocketLocation,
} from '../web-socket/overwrite-web-socket-methods.js';
import {
    buildWebSocketUrl,
    connectWebSocket,
    type CollapsedConnectWebSocketParams,
} from './connect-web-socket.js';
import {MockClientWebSocket} from './mock-client-web-socket.js';

describe('CollapsedConnectWebSocketParams', () => {
    it('uses NoParam for generic params', () => {
        const genericParams: CollapsedConnectWebSocketParams =
            {} as CollapsedConnectWebSocketParams<
                (typeof mockService.sockets)['/custom-props-web-socket']
            >;
    });
});

describe(connectWebSocket.name, () => {
    it('receives events', async () => {
        const events: string[] = [];
        const clientWebSocket = await connectWebSocket(mockService.sockets['/no-client-data'], {
            listeners: {
                close({event}) {
                    events.push(event.type);
                },
                message({event}) {
                    events.push(event.type);
                },
                error({event}) {
                    events.push(event.type);
                },
                open({event}) {
                    events.push(event.type);
                },
            },
            WebSocket: MockClientWebSocket<(typeof mockService.sockets)['/no-client-data']>,
        });

        const messageListener = () => {
            events.push('message');
        };
        clientWebSocket.addEventListener('message', messageListener);
        clientWebSocket.sendFromServer('ok');
        clientWebSocket.removeEventListener('message', messageListener);
        clientWebSocket.sendFromServer('ok');

        clientWebSocket.dispatchEvent('error', {});
        clientWebSocket.sendCallback = () => {
            events.push('send');
        };
        clientWebSocket.send();

        clientWebSocket.close();

        assert.deepEquals(events, [
            'open',
            'message',
            'message',
            'message',
            'error',
            'send',
            'close',
        ]);
    });
    it('rejects invalid messages', async () => {
        const clientWebSocket = await connectWebSocket(mockService.sockets['/no-server-data'], {
            WebSocket: MockClientWebSocket<(typeof mockService.sockets)['/no-server-data']>,
        });

        assert.throws(
            () => {
                // @ts-expect-error: this should be empty
                clientWebSocket.send('this should be empty');
            },
            {
                matchMessage: 'does not expect any message data',
            },
        );

        /** Add a message listener so that server message validation will run. */
        clientWebSocket.addEventListener('message', () => {});

        assert.throws(
            () => {
                // @ts-expect-error: this should be undefined
                clientWebSocket.sendFromServer('this should be undefined');
            },
            {
                matchMessage: 'does not expect any message data',
            },
        );
    });
    it('waits for a reply', async () => {
        const clientWebSocket = await connectWebSocket(mockService.sockets['/no-client-data'], {
            WebSocket: MockClientWebSocket<(typeof mockService.sockets)['/no-client-data']>,
        });

        const replyPromise = clientWebSocket.sendAndWaitForReply();

        await wait({milliseconds: 100});
        clientWebSocket.sendFromServer('ok');

        assert.strictEquals(await replyPromise, 'ok');
    });
    it('times out with no reply', async () => {
        const clientWebSocket = await connectWebSocket(mockService.sockets['/no-client-data'], {
            WebSocket: MockClientWebSocket<(typeof mockService.sockets)['/no-client-data']>,
        });

        await assert.throws(
            () =>
                clientWebSocket.sendAndWaitForReply({
                    timeout: {
                        milliseconds: 100,
                    },
                }),
            {
                matchMessage: 'got no reply from the host',
            },
        );
    });
});

describe(getOppositeWebSocketLocation.name, () => {
    itCases(getOppositeWebSocketLocation, [
        {
            it: 'flips on client',
            input: WebSocketLocation.OnClient,
            expect: WebSocketLocation.OnHost,
        },
        {
            it: 'flips on server',
            input: WebSocketLocation.OnHost,
            expect: WebSocketLocation.OnClient,
        },
    ]);
});

describe(buildWebSocketUrl.name, () => {
    itCases(buildWebSocketUrl, [
        {
            it: 'builds a ws url',
            inputs: [
                {
                    path: '/test',
                    service: {
                        serviceName: 'test',
                        serviceOrigin: 'http://example.com',
                    },
                },
            ],
            expect: 'ws://example.com/test',
        },
        {
            it: 'builds a wss url',
            inputs: [
                {
                    path: '/test',
                    service: {
                        serviceName: 'test',
                        serviceOrigin: 'https://example.com',
                    },
                },
            ],
            expect: 'wss://example.com/test',
        },
        {
            it: 'includes path params',
            inputs: [
                {
                    path: '/test/:param1',
                    service: {
                        serviceName: 'test',
                        serviceOrigin: 'https://example.com',
                    },
                },
                {
                    pathParams: {
                        param1: 'value',
                    },
                },
            ],
            expect: 'wss://example.com/test/value',
        },
    ]);
});
