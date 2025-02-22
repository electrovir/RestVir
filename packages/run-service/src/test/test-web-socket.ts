import {type AnyFunction, type MaybePromise} from '@augment-vir/common';
import {
    type ClientWebSocket,
    type CollapsedConnectWebSocketParams,
    type ConnectWebSocketParams,
    type NoParam,
    type WebSocketDefinition,
} from '@rest-vir/define-service';
import {type ImplementedWebSocket} from '@rest-vir/implement-service';
import {testService} from './test-service.js';

/**
 * Type for {@link testWebSocket}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type TestWebSocket = <WebSocketToTest extends WebSocketDefinition>(
    webSocketDefinition: WebSocketToTest,
    ...args: CollapsedConnectWebSocketParams<WebSocketToTest, false>
) => Promise<ClientWebSocket<WebSocketToTest>>;

/**
 * Test your WebSocket implementation with a real connection pipeline. Make sure to close your
 * WebSocket after each test. Use {@link withWebSocketTest} to automatically close the WebSocket
 * after a test.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export const testWebSocket = async function testWebSocket<
    const WebSocketToTest extends ImplementedWebSocket,
>(
    webSocketImplementation: WebSocketToTest,
    params: ConnectWebSocketParams<Exclude<WebSocketToTest, NoParam>, false>,
) {
    const {connectWebSocket, kill} = await testService(
        {
            ...webSocketImplementation.service,
            webSockets: {
                [webSocketImplementation.path]: webSocketImplementation,
            },
            endpoints: {},
        },
        {
            debug: true,
        },
    );

    const webSocket = await (connectWebSocket[webSocketImplementation.path] as AnyFunction)(params);

    webSocket.addEventListener('close', () => {
        setTimeout(async () => {
            await kill();
        }, 1000);
    });
    return webSocket;
} as TestWebSocket;

/**
 * Callback type for {@link withWebSocketTest}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type WithWebSocketTestCallback<WebSocketToTest extends ImplementedWebSocket> = (
    clientWebSocket: ClientWebSocket<WebSocketToTest>,
) => MaybePromise<void>;

/**
 * Test your WebSocket implementation with a real connection pipeline. This is used to generate an
 * `it` callback and will automatically close the WebSocket connection at the end of the test.
 *
 * You can also use {@link testWebSocket} to directly test a WebSocket but it does not automatically
 * close the WebSocket.
 *
 * This should be used in backend testing to verify your WebSocket implementation.
 *
 * @category Testing : Backend
 * @category Package : @rest-vir/run-service
 * @example
 *
 * ```ts
 * import {withWebSocketTest} from '@rest-vir/run-service';
 * import {describe, it} from '@augment-vir/test'; // or use mocha, jest, etc. values
 *
 * describe('my WebSocket', () => {
 *     it(
 *         'does a thing',
 *         withWebSocketTest(
 *             myServiceImplementation.webSockets['/my-web-socket-path'],
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
