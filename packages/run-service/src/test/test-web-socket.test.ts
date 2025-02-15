import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {withWebSocketTest} from './test-web-socket.js';

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
