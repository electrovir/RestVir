import type {AnyFunction, MaybePromise} from '@augment-vir/common';
import {
    type ClientWebSocket,
    type CollapsedConnectWebSocketParams,
    type ConnectWebSocketParams,
    type NoParam,
    type WebSocketDefinition,
} from '@rest-vir/define-service';
import {type ImplementedWebSocket} from '@rest-vir/implement-service';
import {testService} from './test-service.js';

export type TestWebSocket = <WebSocketToTest extends WebSocketDefinition>(
    socket: WebSocketToTest,
    ...args: CollapsedConnectWebSocketParams<WebSocketToTest, false>
) => Promise<ClientWebSocket<WebSocketToTest>>;

/**
 * Test your WebSocket implementation with a real pipeline.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export const testWebSocket = async function testWebSocket<
    const WebSocketToTest extends ImplementedWebSocket,
>(
    webSocketImplementation: WebSocketToTest,
    params: ConnectWebSocketParams<Exclude<WebSocketToTest, NoParam>, false>,
) {
    const {connectWebSocket, kill} = await testService({
        ...webSocketImplementation.service,
        sockets: {
            [webSocketImplementation.path]: webSocketImplementation,
        },
        endpoints: {},
    });

    const webSocket = await (connectWebSocket[webSocketImplementation.path] as AnyFunction)(params);

    webSocket.addEventListener('close', async () => {
        await kill();
    });
    return webSocket;
} as TestWebSocket;

export type WithWebSocketTestCallback<WebSocketToTest extends ImplementedWebSocket> = (
    clientWebSocket: ClientWebSocket<WebSocketToTest>,
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
 *             myServiceImplementation.sockets['/my-web-socket-path'],
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
export function withWebSocketTest<const WebSocketToTest extends ImplementedWebSocket>(
    webSocketDefinition: WebSocketToTest,
    params: Omit<ConnectWebSocketParams<WebSocketToTest, false>, 'listeners'>,
    callback: WithWebSocketTestCallback<WebSocketToTest>,
) {
    return async () => {
        const clientWebSocket = await testWebSocket<any>(webSocketDefinition, params as any);

        await callback(clientWebSocket as any);

        clientWebSocket.close();
    };
}
