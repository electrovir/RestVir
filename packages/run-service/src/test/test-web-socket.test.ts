import {assert, waitUntil} from '@augment-vir/assert';
import {stringify} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin, defineService} from '@rest-vir/define-service';
import {implementService} from '@rest-vir/implement-service';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {testWebSocket, withWebSocketTest} from './test-web-socket.js';

describe(testWebSocket.name, () => {
    it('fires listeners', async () => {
        const listeners = {
            closedOnClient: false,
            closedOnServer: false,
            openedOnClient: false,
            openedOnServer: false,
            messageOnClient: false,
            messageOnServer: false,
        };
        const webSocket = await testWebSocket(
            implementService(
                {
                    service: defineService({
                        requiredClientOrigin: AnyOrigin,
                        serviceName: 'test',
                        serviceOrigin: 'http://localhost:3000',
                        webSockets: {
                            '/socket': {
                                messageFromClientShape: undefined,
                                messageFromHostShape: undefined,
                            },
                        },
                    }),
                },
                {
                    webSockets: {
                        '/socket': {
                            open() {
                                listeners.openedOnServer = true;
                            },
                            close() {
                                listeners.closedOnServer = true;
                            },
                            message({webSocket}) {
                                listeners.messageOnServer = true;
                                webSocket.send();
                            },
                        },
                    },
                },
            ).webSockets['/socket'],
            {
                listeners: {
                    open() {
                        listeners.openedOnClient = true;
                    },
                    close() {
                        listeners.closedOnClient = true;
                    },
                    message() {
                        listeners.messageOnClient = true;
                    },
                },
            },
        );

        await waitUntil.isTrue(
            () => listeners.openedOnClient && listeners.openedOnServer,
            undefined,
            `never opened: ${stringify(listeners)}`,
        );

        webSocket.send();

        await waitUntil.isTrue(
            () => listeners.messageOnClient && listeners.messageOnServer,
            undefined,
            `never got message: ${stringify(listeners)}`,
        );

        webSocket.close();

        await waitUntil.isTrue(
            () => listeners.closedOnClient && listeners.closedOnServer,
            {
                timeout: {
                    /** For some reason closing a WebSocket takes _forever_! */
                    minutes: 5,
                },
            },
            `never closed: ${stringify(listeners)}`,
        );
    });
});

describe(withWebSocketTest.name, () => {
    it(
        'tests a basic WebSocket connection',
        withWebSocketTest(
            mockServiceImplementation.webSockets['/no-client-data'],
            {},
            async (webSocket) => {
                const response = await webSocket.sendAndWaitForReply();
                assert.strictEquals(response, 'ok');
            },
        ),
    );
    it('requires protocols', async () => {
        await assert.throws(
            withWebSocketTest(
                mockServiceImplementation.webSockets['/required-protocols'],
                // @ts-expect-error: protocols are missing
                {},
                async () => {},
            ),
            {
                matchMessage: 'Unexpected server response: 400',
            },
        );
    });
    it(
        'accepts protocols',
        withWebSocketTest(
            mockServiceImplementation.webSockets['/required-protocols'],
            {
                protocols: [
                    'a',
                    'yo',
                    'hi',
                ],
            },
            async (webSocket) => {
                const response = await webSocket.sendAndWaitForReply({
                    message: 'hello',
                });
                assert.strictEquals(response, 'ok');
            },
        ),
    );
    it('requires protocols', async () => {
        await assert.throws(
            withWebSocketTest(
                mockServiceImplementation.webSockets['/required-protocols'],
                {
                    protocols: [
                        'a',
                        // @ts-expect-error: this should be a string, but it'll get stringified anyway
                        -1,
                        // @ts-expect-error: this should be 'hi'
                        'wrong',
                    ],
                },
                async () => {},
            ),
            {
                matchMessage: 'Unexpected server response: 400',
            },
        );
    });
    it('rejects empty string protocols', async () => {
        await assert.throws(
            withWebSocketTest(
                mockServiceImplementation.webSockets['/required-protocols'],
                {
                    protocols: [
                        '',
                        'a',
                        'hi',
                    ],
                },
                async () => {},
            ),
            {
                matchMessage:
                    "Invalid protocols given (', a, hi'): Unexpected character at index 0",
            },
        );
    });
});
