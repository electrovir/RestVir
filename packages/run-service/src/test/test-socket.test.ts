import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {withWebSocketTest} from './test-socket.js';

describe(withWebSocketTest.name, () => {
    it(
        'tests a basic WebSocket connection',
        withWebSocketTest(
            mockServiceImplementation.sockets['/no-client-data'],
            {},
            async (webSocket) => {
                const response = await webSocket.sendAndWaitForReply();
                assert.strictEquals(response, 'ok');
            },
        ),
    );
});
