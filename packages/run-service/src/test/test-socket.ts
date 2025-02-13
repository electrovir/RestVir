import type {AnyFunction, MaybePromise} from '@augment-vir/common';
import {
    type ClientWebSocket,
    type CollapsedConnectSocketParams,
    type ConnectSocketParams,
    type NoParam,
    type Socket,
} from '@rest-vir/define-service';
import {type ImplementedSocket} from '@rest-vir/implement-service';
import {testService} from './test-service.js';

export type TestWebSocket = <SocketToTest extends Socket>(
    socket: SocketToTest,
    ...args: CollapsedConnectSocketParams<SocketToTest, false>
) => Promise<ClientWebSocket<SocketToTest>>;

/**
 * Test your WebSocket implementation with a real pipeline.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export const testWebSocket = async function testWebSocket<
    const SocketToTest extends ImplementedSocket,
>(
    webSocketImplementation: SocketToTest,
    params: ConnectSocketParams<Exclude<SocketToTest, NoParam>, false>,
) {
    const {connectSocket, kill} = await testService({
        ...webSocketImplementation.service,
        sockets: {
            [webSocketImplementation.path]: webSocketImplementation,
        },
        endpoints: {},
    });

    const webSocket = await (connectSocket[webSocketImplementation.path] as AnyFunction)(params);

    webSocket.addEventListener('close', async () => {
        await kill();
    });
    return webSocket;
} as TestWebSocket;

export type WithWebSocketTestCallback<SocketToTest extends ImplementedSocket> = (
    clientWebSocket: ClientWebSocket<SocketToTest>,
) => MaybePromise<void>;

/**
 * Test a WebSocket implementation by using this to generate an `it` callback.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @example
 *
 * ```ts
 * import {withWebSocketTest} from '@rest-vir/run-service';
 * import {describe, it} from '@augment-vir/test'; // or use mocha, jest, etc. values
 *
 * describe('my web socket', () => {
 *     it(
 *         'does a thing',
 *         withWebSocketTest(
 *             myServiceImplementation.sockets['/my-socket-path'],
 *             {},
 *             (webSocket) => {
 *                 const response = await webSocket.sendAndWaitForReply();
 *                 assert.strictEquals(response, 'ok');
 *             },
 *         ),
 *     );
 * });
 * ```
 *
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function withWebSocketTest<const SocketToTest extends ImplementedSocket>(
    webSocketDefinition: SocketToTest,
    params: Omit<ConnectSocketParams<SocketToTest, false>, 'listeners'>,
    callback: WithWebSocketTestCallback<SocketToTest>,
) {
    return async () => {
        const clientWebSocket = await testWebSocket<any>(webSocketDefinition, params as any);

        await callback(clientWebSocket as any);

        clientWebSocket.close();
    };
}
