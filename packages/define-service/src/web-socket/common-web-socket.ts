import type {AnyFunction} from '@augment-vir/common';

/**
 * A WebSocket interface that matches both [client-side
 * WebSockets](https://developer.mozilla.org/docs/Web/API/WebSocket) and [host-side
 * WebSockets](https://github.com/websockets/ws/blob/HEAD/doc/ws.md#class-websocket).
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export abstract class CommonWebSocket {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(url: string | URL, protocols?: string | string[]) {}
    /**
     * A `WebSocket.send` method that is compatible with the native method
     * (https://developer.mozilla.org/docs/Web/API/WebSocket/send) and the `ws` package's method
     * (https://github.com/websockets/ws/blob/HEAD/doc/ws.md#websocketsenddata-options-callback)
     */
    public abstract send: (data: any) => void;
    /**
     * A `WebSocket.readyState` property that is compatible with the native property
     * (https://developer.mozilla.org/docs/Web/API/WebSocket/readyState) and the `ws` package's
     * property (https://github.com/websockets/ws/blob/HEAD/doc/ws.md#websocketreadystate)
     */
    public abstract readyState: CommonWebSocketState;
    /**
     * A `WebSocket.addEventListener` method that is compatible with the native method
     * (https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener) and the `ws`
     * package's method
     * (https://github.com/websockets/ws/blob/HEAD/doc/ws.md#websocketaddeventlistenertype-listener-options)
     */
    public abstract addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: (event: CommonWebSocketEventMap[EventName]) => void,
        options?: CommonWebSocketListenerOptions,
    ): void;
    /**
     * A `WebSocket.removeEventListener` method that is compatible with the native method
     * (https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener) and the `ws`
     * package's method
     * (https://github.com/websockets/ws/blob/HEAD/doc/ws.md#websocketremoveeventlistenertype-listener)
     */
    public abstract removeEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: AnyFunction,
    ): void;
    /**
     * A `WebSocket.close` method that is compatible with the native method
     * (https://developer.mozilla.org/docs/Web/API/WebSocket/close) and the `ws` package's method
     * (https://github.com/websockets/ws/blob/HEAD/doc/ws.md#websocketclosecode-reason)
     */
    public abstract close(): void;
}

/**
 * `WebSocket.addEventListener` options that are compatible with both the native method
 * (https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener) and the `ws` package's
 * method
 * (https://github.com/websockets/ws/blob/HEAD/doc/ws.md#websocketaddeventlistenertype-listener-options)
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type CommonWebSocketListenerOptions = {
    once?: boolean;
};

/**
 * All values for
 * [WebSocket.readyState](https://developer.mozilla.org/docs/Web/API/WebSocket/readyState).
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export enum CommonWebSocketState {
    Connecting = 0,
    Open = 1,
    Closing = 2,
    Closed = 3,
}

/**
 * A mapping of WebSocket events that are compatible with both [client-side
 * WebSockets](https://developer.mozilla.org/docs/Web/API/WebSocket) and [host-side
 * WebSockets](https://github.com/websockets/ws/blob/HEAD/doc/ws.md#class-websocket).
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type CommonWebSocketEventMap = {
    open: {
        target: CommonWebSocket;
        type: string;
    };
    error: {
        target: CommonWebSocket;
        type: string;
    };
    close: {
        code: number;
        reason: string;
        wasClean: boolean;
        target: CommonWebSocket;
        type: string;
    };
    message: {
        data: unknown;
        target: CommonWebSocket;
        type: string;
    };
};
