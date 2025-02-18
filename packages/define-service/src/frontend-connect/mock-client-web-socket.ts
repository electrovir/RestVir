import {
    getOrSet,
    type AnyObject,
    type MaybePromise,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {parseJsonWithUndefined} from '../augments/json.js';
import {
    CommonWebSocket,
    CommonWebSocketEventMap,
    CommonWebSocketState,
} from '../web-socket/common-web-socket.js';
import {
    GenericConnectWebSocketParams,
    WebSocketLocation,
    type ClientWebSocket,
} from '../web-socket/overwrite-web-socket-methods.js';
import {WebSocketDefinition} from '../web-socket/web-socket-definition.js';

/**
 * Parameters for {@link MockClientWebSocketClientSendCallback}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MockClientWebSocketClientSendCallbackParams<
    WebSocketToConnect extends WebSocketDefinition,
> = {
    webSocket: ClientWebSocket<WebSocketToConnect, MockClientWebSocket<WebSocketToConnect>>;
    messageData: WebSocketToConnect['MessageFromClientType'];
    messageSource: WebSocketLocation;
};

/**
 * Type for {@link MockClientWebSocket.sendCallback}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MockClientWebSocketClientSendCallback<WebSocketToConnect extends WebSocketDefinition> =
    (params: MockClientWebSocketClientSendCallbackParams<WebSocketToConnect>) => MaybePromise<void>;

/**
 * Options for {@link MockClientWebSocket} and {@link createMockClientWebSocketConstructor}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MockClientWebSocketOptions<WebSocketToConnect extends WebSocketDefinition> =
    PartialWithUndefined<{
        /**
         * Set this to `true` if you want to prevent this mock WebSocket from immediately opening
         * itself. You can then use `.open()` at any time to manually open it.
         */
        preventImmediateOpen: boolean;
        sendCallback: MockClientWebSocketClientSendCallback<WebSocketToConnect>;
    }>;

/**
 * Use this to create a mock WebSocket constructor for unit testing Web Socket connection.
 *
 * This creates a {@link MockClientWebSocket} constructor for connections from the client side with
 * types for the given {@link WebSocketDefinition} and utilizing the given
 * {@link MockClientWebSocketOptions} instance. This can be passed to `connectWebSocket` as the
 * `webSocketConstructor` to allow unit testing on a client without spinning up an entire host to
 * serve the WebSocket connection.
 *
 * @category Testing : Client (Frontend)
 * @category Package : @rest-vir/define-service
 * @example
 *
 * ```ts
 * import {
 *     connectWebSocket,
 *     createMockClientWebSocketConstructor,
 * } from '@rest-vir/define-service';
 *
 * const webSocket = await connectWebSocket(myService.webSockets['/my-path'], {
 *     webSocketConstructor: createMockClientWebSocketConstructor(
 *         myService.webSockets['/my-path'],
 *         {preventImmediateOpen: true},
 *     ),
 * });
 *
 * // mock server responses without an actual server
 * webSocket.sendFromHost(myMessage);
 * ```
 *
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockClientWebSocketConstructor<
    const WebSocketToConnect extends WebSocketDefinition,
>(
    webSocketToConnect: Readonly<WebSocketToConnect>,
    options: Readonly<MockClientWebSocketOptions<WebSocketToConnect>> = {},
): typeof MockClientWebSocket<WebSocketToConnect> {
    return class extends MockClientWebSocket<WebSocketToConnect> {
        constructor(
            ...params: ConstructorParameters<
                NonNullable<GenericConnectWebSocketParams<any>['webSocketConstructor']>
            >
        ) {
            super(...params, options);
        }
    };
}

/**
 * Type for {@link MockClientWebSocket.listeners}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MockClientWebSocketListeners = Partial<{
    [EventName in keyof CommonWebSocketEventMap]: Set<
        (event: CommonWebSocketEventMap[EventName]) => void
    >;
}>;
/**
 * A mock WebSocket constructor for connections from the client side. This can be passed to
 * `connectWebSocket` as the `webSocketConstructor` to allow unit testing on a client without
 * spinning up an entire host to serve the WebSocket connection.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @example
 *
 * ```ts
 * import {connectWebSocket, MockClientWebSocket} from '@rest-vir/define-service';
 *
 * const webSocket = await connectWebSocket(myService.webSockets['/my-path'], {
 *     webSocketConstructor: MockClientWebSocket<(typeof myService.webSockets)['/my-path']>,
 * });
 *
 * // mock server responses without an actual server
 * webSocket.sendFromHost(myMessage);
 * ```
 *
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export class MockClientWebSocket<const WebSocketToConnect extends WebSocketDefinition = any>
    implements CommonWebSocket
{
    /**
     * Mocked WebSocket event listeners. While this is public, you should attach a listener using
     * {@link MockClientWebSocket.addEventListener} method and remove them with
     * {@link MockClientWebSocket.removeEventListener}, as you would with a normal WebSocket
     * instance.
     */
    public listeners: MockClientWebSocketListeners = {};

    /**
     * Implements and mocks the standard `WebSocket.readyState` property.
     *
     * @see https://developer.mozilla.org/docs/Web/API/WebSocket/readyState
     */
    public readyState: CommonWebSocketState = CommonWebSocketState.Connecting;

    /**
     * This callback will be called whenever a message is sent to or from the WebSocket. This is set
     * via the constructor option `sendCallback`.
     *
     * @example
     *
     * ```ts
     * import {MockClientWebSocket, connectWebSocket} from '@rest-vir/define-service';
     *
     * const webSocket = await connectWebSocket(myService.webSockets['/my-socket'], {
     *     webSocketConstructor: createMockClientWebSocketConstructor(
     *         myService.webSockets['/my-socket'],
     *         {
     *             sendCallback: (message) => {
     *                 // handle the sent message here
     *                 console.log('handled message:', message);
     *             },
     *         },
     *     ),
     * });
     * ```
     */
    public sendCallback: MockClientWebSocketClientSendCallback<WebSocketToConnect> | undefined;

    constructor(
        ...[
            ,
            ,
            ,
            options = {},
        ]: [
            ...ConstructorParameters<
                NonNullable<GenericConnectWebSocketParams<any>['webSocketConstructor']>
            >,
            options?: Readonly<MockClientWebSocketOptions<WebSocketToConnect>>,
        ]
    ) {
        if (!options.preventImmediateOpen) {
            this.open();
        }
        if (options.sendCallback) {
            this.sendCallback = options.sendCallback;
        }
    }

    /**
     * Manually set the WebSocket connection as opened. This is only necessary to use if you've set
     * the constructor options to
     */
    public open() {
        setTimeout(() => {
            if (this.readyState === CommonWebSocketState.Connecting) {
                this.readyState = CommonWebSocketState.Open;
                this.dispatchEvent('open', {});
            }
        });
    }

    /** Manually close and cleanup the WebSocket. */
    public close() {
        this.dispatchEvent('close', {
            code: 0,
            reason: 'manually closed',
            wasClean: true,
        });
        this.listeners = {};
        this.readyState = CommonWebSocketState.Closed;
    }

    /**
     * Dispatch a WebSocket event. This is primarily used within the MockClientWebSocket class
     * itself but may also be used externally to test various WebSocket scenarios.
     *
     * Note that dispatching `'open'` and `'close'` events will not actually close or open the
     * WebSocket. Use the {@link MockClientWebSocket.open} and {@link MockClientWebSocket.close}
     * methods instead (which appropriately dispatch their events).
     */
    public dispatchEvent<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        event: Omit<CommonWebSocketEventMap[EventName], 'type' | 'target'>,
    ) {
        this.listeners[eventName]?.forEach((listener) =>
            listener({
                ...event,
                target: this,
                type: eventName,
            } as AnyObject as CommonWebSocketEventMap[EventName]),
        );
    }

    /**
     * Implements and mocks the standard `WebSocket.addEventListener` property but with message type
     * safety.
     *
     * @see https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener
     */
    public addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: (event: CommonWebSocketEventMap[EventName]) => void,
    ): void {
        getOrSet(this.listeners, eventName, () => new Set<any>()).add(listener as any);
    }
    /**
     * Implements and mocks the standard `WebSocket.removeEventListener` property but with message
     * type safety.
     *
     * @see https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener
     */
    public removeEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: (event: CommonWebSocketEventMap[EventName]) => void,
    ): void {
        this.listeners[eventName]?.delete(listener);
    }
    /**
     * Implements and mocks the standard `WebSocket.send` property but with message type safety.
     *
     * @see https://developer.mozilla.org/docs/Web/API/WebSocket/send
     */
    public send(data: any): void {
        if (this.readyState !== CommonWebSocketState.Open) {
            return;
        }

        void this.sendCallback?.({
            messageData: parseJsonWithUndefined(data),
            messageSource: WebSocketLocation.OnClient,
            webSocket: this as any,
        });
    }

    /**
     * Sends a message as if it came from the WebSocket host. Use this to unit test client-side
     * WebSockets without needing a running host.
     */
    public sendFromHost(data: WebSocketToConnect['MessageFromHostType']) {
        if (this.readyState !== CommonWebSocketState.Open) {
            return;
        }
        this.dispatchEvent('message', {
            data,
        });

        void this.sendCallback?.({
            messageData: data,
            messageSource: WebSocketLocation.OnHost,
            webSocket: this as any,
        });
    }
}
