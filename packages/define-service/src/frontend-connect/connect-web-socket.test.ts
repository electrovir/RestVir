import {assert} from '@augment-vir/assert';
import {wait} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import {CommonWebSocketState} from '../web-socket/common-web-socket.js';
import {
    GenericConnectWebSocketParams,
    getOppositeWebSocketLocation,
    WebSocketLocation,
    type ClientWebSocket,
} from '../web-socket/overwrite-web-socket-methods.js';
import {
    buildWebSocketUrl,
    connectWebSocket,
    type CollapsedConnectWebSocketParams,
} from './connect-web-socket.js';
import {mockServiceApi} from './generate-api.mock.js';
import {
    createMockClientWebSocketConstructor,
    MockClientWebSocket,
} from './mock-client-web-socket.js';

describe('CollapsedConnectWebSocketParams', () => {
    it('uses NoParam for generic params', () => {
        assert.tsType(mockService.webSockets['/custom-props-web-socket'].searchParamsShape);

        const genericParams: CollapsedConnectWebSocketParams =
            {} as CollapsedConnectWebSocketParams<
                (typeof mockService.webSockets)['/custom-props-web-socket']
            >;
    });
});

describe(connectWebSocket.name, () => {
    it('is assignable to a client web socket', async () => {
        /** These will fail because there isn't a server responding. */
        await assert.throws(async () => {
            const webSockets: ClientWebSocket<
                (typeof mockService.webSockets)['/no-client-data']
            >[] = [
                await mockServiceApi.webSockets['/no-client-data'].connect(),
                await connectWebSocket(mockService.webSockets['/no-client-data']),
            ];
            const webSockets2: ClientWebSocket<
                (typeof mockServiceApi)['webSockets']['/no-client-data']
            >[] = [
                await mockServiceApi.webSockets['/no-client-data'].connect(),
                await connectWebSocket(mockService.webSockets['/no-client-data']),
            ];
        });
    });

    it('receives events', async () => {
        const events: string[] = [];

        assert.tsType(mockService.webSockets['/no-client-data'].protocolsShape).equals<undefined>();

        const clientWebSocket = await connectWebSocket(mockService.webSockets['/no-client-data'], {
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
            webSocketConstructor: MockClientWebSocket<
                (typeof mockService.webSockets)['/no-client-data']
            >,
        });

        const messageListener = () => {
            events.push('message');
        };
        clientWebSocket.addEventListener('message', messageListener);
        clientWebSocket.sendFromHost('ok');
        clientWebSocket.removeEventListener('message', messageListener);
        clientWebSocket.sendFromHost('ok');

        clientWebSocket.dispatchEvent('error', {});
        clientWebSocket.sendCallback = () => {
            events.push('send');
        };
        clientWebSocket.send();

        await clientWebSocket.close();

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
        const clientWebSocket = await connectWebSocket(mockService.webSockets['/no-server-data'], {
            webSocketConstructor: MockClientWebSocket<
                (typeof mockService.webSockets)['/no-server-data']
            >,
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
                clientWebSocket.sendFromHost('this should be undefined');
            },
            {
                matchMessage: 'does not expect any message data',
            },
        );
    });
    it('uses the default constructor', async () => {
        await assert.throws(() =>
            connectWebSocket({
                ...mockService.webSockets['/no-server-data'],
                service: {
                    ...mockService.webSockets['/no-server-data'].service,
                    /** This should fail. */
                    serviceOrigin: 'localhost:0',
                },
            }),
        );
    });
    it('waits for a reply', async () => {
        const clientWebSocket = await connectWebSocket(mockService.webSockets['/no-client-data'], {
            webSocketConstructor: MockClientWebSocket<
                (typeof mockService.webSockets)['/no-client-data']
            >,
        });

        const replyPromise = clientWebSocket.sendAndWaitForReply();

        await wait({milliseconds: 100});
        clientWebSocket.sendFromHost('ok');

        assert.strictEquals(await replyPromise, 'ok');
    });
    it('waits for a reply that matches replyCheck', async () => {
        const clientWebSocket = await connectWebSocket(mockService.webSockets['/sends-protocol'], {
            webSocketConstructor: MockClientWebSocket<
                (typeof mockService.webSockets)['/sends-protocol']
            >,
        });

        const replyPromise = clientWebSocket.sendAndWaitForReply({
            replyCheck(messageFromHost) {
                return messageFromHost[0] === 'c';
            },
        });

        await wait({milliseconds: 100});
        clientWebSocket.sendFromHost(['a']);
        clientWebSocket.sendFromHost(['b']);
        clientWebSocket.sendFromHost(['c']);

        assert.deepEquals(await replyPromise, ['c']);
    });
    it('fails if WebSocket emits error while opening', async () => {
        class ImmediateErrorMockWebSocket extends MockClientWebSocket<
            (typeof mockService.webSockets)['/no-client-data']
        > {
            constructor(
                ...params: ConstructorParameters<
                    NonNullable<GenericConnectWebSocketParams<any>['webSocketConstructor']>
                >
            ) {
                super(...params, {preventImmediateOpen: true});
                setTimeout(() => this.dispatchEvent('error', {}), 3000);
            }
        }

        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: ImmediateErrorMockWebSocket,
                }),
            {
                matchMessage: 'WebSocket connection failed',
            },
        );
    });
    it('fails if WebSocket never opens', async () => {
        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: createMockClientWebSocketConstructor(
                        mockService.webSockets['/no-client-data'],
                        {
                            preventImmediateOpen: true,
                        },
                    ),
                }),
            {
                matchMessage: 'WebSocket never opened',
            },
        );
    });
    it('fails if WebSocket closes before it can open', async () => {
        class NeverOpenMockWebSocket extends MockClientWebSocket<
            (typeof mockService.webSockets)['/no-client-data']
        > {
            constructor(
                ...params: ConstructorParameters<
                    NonNullable<GenericConnectWebSocketParams<any>['webSocketConstructor']>
                >
            ) {
                super(...params, {preventImmediateOpen: true});
                this.readyState = CommonWebSocketState.Closed;
            }
        }

        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: NeverOpenMockWebSocket,
                }),
            {
                matchMessage: 'WebSocket closed while waiting for it to open',
            },
        );
    });
    it('passes protocols', async () => {
        const clientWebSocket = await connectWebSocket(mockService.webSockets['/no-client-data'], {
            webSocketConstructor: MockClientWebSocket<
                (typeof mockService.webSockets)['/no-client-data']
            >,
            protocols: [
                'a',
                'b',
                'c',
            ],
        });

        const replyPromise = clientWebSocket.sendAndWaitForReply();

        await wait({milliseconds: 100});
        clientWebSocket.sendFromHost('ok');

        assert.strictEquals(await replyPromise, 'ok');
    });
    it('does not send data if the socket has closed', async () => {
        const messages: (undefined | string)[] = [];
        const clientWebSocket = await connectWebSocket(mockService.webSockets['/no-client-data'], {
            webSocketConstructor: createMockClientWebSocketConstructor(
                mockService.webSockets['/no-client-data'],
                {
                    sendCallback({messageData}) {
                        messages.push(messageData);
                    },
                },
            ),
        });

        clientWebSocket.send();
        clientWebSocket.sendFromHost('ok');

        await clientWebSocket.close();

        clientWebSocket.send();
        clientWebSocket.sendFromHost('ok');
        clientWebSocket.send();
        clientWebSocket.sendFromHost('ok');

        assert.deepEquals(messages, [
            undefined,
            'ok',
        ]);
    });
    it('rejects empty protocol', async () => {
        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: MockClientWebSocket<
                        (typeof mockService.webSockets)['/no-client-data']
                    >,
                    protocols: [
                        '',
                        'b',
                        'c',
                    ],
                }),
            {
                matchMessage: 'Invalid protocols given',
            },
        );
    });
    it('rejects duplicate start protocols', async () => {
        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: MockClientWebSocket<
                        (typeof mockService.webSockets)['/no-client-data']
                    >,
                    protocols: [
                        'a',
                        'a',
                        'c',
                    ],
                }),
            {
                matchMessage: 'Invalid protocols given',
            },
        );
    });
    it('rejects duplicate end protocols', async () => {
        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: MockClientWebSocket<
                        (typeof mockService.webSockets)['/no-client-data']
                    >,
                    protocols: [
                        'a',
                        'b',
                        'a',
                    ],
                }),
            {
                matchMessage: 'Invalid protocols given',
            },
        );
    });
    it('rejects comma protocol', async () => {
        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: MockClientWebSocket<
                        (typeof mockService.webSockets)['/no-client-data']
                    >,
                    protocols: [
                        ',',
                        'b',
                        'a',
                    ],
                }),
            {
                matchMessage: 'Invalid protocols given',
            },
        );
    });
    it('rejects first empty string protocol', async () => {
        await assert.throws(
            () =>
                connectWebSocket(mockService.webSockets['/no-client-data'], {
                    webSocketConstructor: MockClientWebSocket<
                        (typeof mockService.webSockets)['/no-client-data']
                    >,
                    protocols: [
                        ' ',
                        'b',
                        'a',
                    ],
                }),
            {
                matchMessage: 'Invalid protocols given',
            },
        );
    });
    it('times out with no reply', async () => {
        const clientWebSocket = await connectWebSocket(mockService.webSockets['/no-client-data'], {
            webSocketConstructor: MockClientWebSocket<
                (typeof mockService.webSockets)['/no-client-data']
            >,
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
