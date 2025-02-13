import {waitUntil} from '@augment-vir/assert';
import {
    AnyObject,
    DeferredPromise,
    getOrSet,
    MaybePromise,
    Overwrite,
    SelectFrom,
    stringify,
    type AnyFunction,
    type Values,
} from '@augment-vir/common';
import {convertDuration, type AnyDuration} from 'date-vir';
import {assertValidShape} from 'object-shape-tester';
import type {Constructor, HasRequiredKeys} from 'type-fest';
import {parseJsonWithUndefined} from '../augments/json.js';
import {NoParam} from '../util/no-param.js';
import {
    CommonWebSocket,
    CommonWebSocketEventMap,
    CommonWebSocketState,
} from './common-web-socket.js';
import {Socket} from './socket.js';

/**
 * Location of the WebSocket in question: on a client connecting to a WebSocket host or on the host
 * that's accepting WebSocket connections.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export enum WebSocketLocation {
    OnHost = 'on-host',
    OnClient = 'on-client',
}

/**
 * Returns the inverse WebSocket location compared to the given WebSocket location. For example,
 * passing in `SocketLocation.OnHost` here will give you `SocketLocation.OnClient`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function getOppositeSocketLocation(
    originalWebSocketLocation: WebSocketLocation,
): WebSocketLocation {
    if (originalWebSocketLocation === WebSocketLocation.OnClient) {
        return WebSocketLocation.OnHost;
    } else {
        return WebSocketLocation.OnClient;
    }
}

/**
 * Returns the inverse WebSocket location compared to the given WebSocket location. For example,
 * passing in `SocketLocation.OnHost` here will give you `SocketLocation.OnClient`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type FlipWebSocketLocation<Location extends WebSocketLocation> =
    Location extends WebSocketLocation.OnHost
        ? WebSocketLocation.OnClient
        : WebSocketLocation.OnHost;

/**
 * Determines a message's type based on the WebSocketLocation of where that message came from.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type GetWebSocketMessageTypeFromLocation<
    SpecificWebSocket extends Readonly<
        Pick<Socket, 'MessageFromClientType' | 'MessageFromHostType'>
    >,
    MessageFromSource extends WebSocketLocation,
> = MessageFromSource extends WebSocketLocation.OnClient
    ? SpecificWebSocket['MessageFromClientType']
    : SpecificWebSocket['MessageFromHostType'];

/**
 * Parameters for the `sendAndWaitForReply` method that gets attached to WebSockets.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type SendAndWaitForReplyParams<
    Location extends WebSocketLocation,
    WebSocketDefinition extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam = NoParam,
> = (WebSocketDefinition extends NoParam
    ? {
          /** Generic message to send. */
          message?: any;
      }
    : GetWebSocketMessageTypeFromLocation<
            Exclude<WebSocketDefinition, NoParam>,
            Location
        > extends undefined
      ? {
            /** The message data to send to the other side of the WebSocket connection. */
            message?: GetWebSocketMessageTypeFromLocation<
                Exclude<WebSocketDefinition, NoParam>,
                Location
            >;
        }
      : {
            /** The message data to send to the other side of the WebSocket connection. */
            message: GetWebSocketMessageTypeFromLocation<
                Exclude<WebSocketDefinition, NoParam>,
                Location
            >;
        }) & {
    /**
     * The duration to wait for a server message. If this duration is exceeded and a response still
     * hasn't been received, an error is thrown.
     *
     * @default {seconds: 10}
     */
    timeout?: Readonly<AnyDuration> | undefined;
};

/**
 * Collapsed version of {@link SendAndWaitForReplyParams} for the `sendAndWaitForReply` method that
 * only _requires_ an object parameter if the parameters object has any required keys.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type CollapsedSendAndWaitForReplyParams<
    Location extends WebSocketLocation,
    SocketDefinition extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam = NoParam,
> =
    HasRequiredKeys<SendAndWaitForReplyParams<Location, SocketDefinition>> extends true
        ? [SendAndWaitForReplyParams<Location, SocketDefinition>]
        : [SendAndWaitForReplyParams<Location, SocketDefinition>?];

/**
 * Takes any WebSocket class and overwrites it with some new rest vir methods and makes some
 * existing WebSocket methods type safe.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type OverwriteWebSocketMethods<
    WebSocketClass extends CommonWebSocket,
    Location extends WebSocketLocation,
    SocketDefinition extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam = NoParam,
> = Overwrite<
    WebSocketClass,
    {
        /**
         * Adds an event listener that's wrapped in assertions to verify that message events have
         * the expected contents.
         */
        addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
            eventName: EventName,
            listener: SocketListener<
                EventName,
                SocketDefinition,
                FlipWebSocketLocation<Location>,
                WebSocketClass
            >,
        ): void;
        /**
         * Sends a message to the other side of the WebSocket connection and waits that other side
         * to send a message in response.
         *
         * This will catch messages that might not have been intended as a response for the original
         * message as it will catch _any_ message sent from the other side.
         */
        sendAndWaitForReply(
            ...params: CollapsedSendAndWaitForReplyParams<Location, SocketDefinition>
        ): Promise<
            SocketDefinition extends NoParam
                ? any
                : GetWebSocketMessageTypeFromLocation<
                      Exclude<SocketDefinition, NoParam>,
                      FlipWebSocketLocation<Location>
                  >
        >;
        /**
         * Sends data through the WebSocket to the other side of the connection. This rest-vir
         * wrapper ensures that all sent messages match expected types from the WebSocket
         * definition.
         *
         * See [MDN](https://developer.mozilla.org/docs/Web/API/WebSocket/send) for the original
         * `WebSocket.send()` docs.
         */
        send(
            ...args: SocketDefinition extends NoParam
                ? [message?: any]
                : GetWebSocketMessageTypeFromLocation<
                        Exclude<SocketDefinition, NoParam>,
                        Location
                    > extends undefined
                  ? [
                        message?: GetWebSocketMessageTypeFromLocation<
                            Exclude<SocketDefinition, NoParam>,
                            Location
                        >,
                    ]
                  : [
                        message: GetWebSocketMessageTypeFromLocation<
                            Exclude<SocketDefinition, NoParam>,
                            Location
                        >,
                    ]
        ): void;
    }
>;

/**
 * A WebSocket instance used only in clients to connect to a host.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ClientWebSocket<
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam = NoParam,
    WebSocketClass extends CommonWebSocket = CommonWebSocket,
> = OverwriteWebSocketMethods<WebSocketClass, WebSocketLocation.OnClient, SocketToConnect>;

/**
 * Parameters for a type-safe WebSocket listener callback. Used in {@link SocketListener}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type SocketListenerParams<
    EventName extends keyof CommonWebSocketEventMap,
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam,
    MessageSource extends WebSocketLocation,
    WebSocketClass extends CommonWebSocket,
> = {
    socket: SocketToConnect extends NoParam
        ? Readonly<
              Overwrite<
                  Socket,
                  /**
                   * This `Overwrite` is needed so that
                   * `CollapsedConnectSocketParams<ACTUAL_SOCKET>` can be assigned to
                   * `CollapsedConnectSocketParams<NoParam>`. Idk why.
                   */
                  {path: any; customProps: any}
              >
          >
        : Readonly<SocketToConnect>;
    webSocket: ClientWebSocket<SocketToConnect, WebSocketClass>;
} & (EventName extends 'message'
    ? {
          event: Overwrite<
              CommonWebSocketEventMap[EventName],
              {
                  data: SocketToConnect extends NoParam
                      ? any
                      : GetWebSocketMessageTypeFromLocation<
                            Exclude<SocketToConnect, NoParam>,
                            MessageSource
                        >;
              }
          >;
          message: SocketToConnect extends NoParam
              ? any
              : GetWebSocketMessageTypeFromLocation<
                    Exclude<SocketToConnect, NoParam>,
                    MessageSource
                >;
      }
    : {
          event: CommonWebSocketEventMap[EventName];
      });

/**
 * An object defining declaratively created listeners that will be attached to a rest-vir
 * client-side WebSocket.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ConnectSocketListeners<
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam,
    WebSocketClass extends CommonWebSocket,
> = Partial<{
    [EventName in keyof CommonWebSocketEventMap]: SocketListener<
        EventName,
        SocketToConnect,
        WebSocketLocation.OnHost,
        WebSocketClass
    >;
}>;

/**
 * A type-safe WebSocket listener callback.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type SocketListener<
    EventName extends keyof CommonWebSocketEventMap,
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam,
    MessageSource extends WebSocketLocation,
    WebSocketClass extends CommonWebSocket,
> = (
    params: SocketListenerParams<EventName, SocketToConnect, MessageSource, WebSocketClass>,
) => MaybePromise<void>;

/**
 * Generic connection parameters for `connectSocket`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type GenericConnectSocketParams<WebSocketClass extends CommonWebSocket> = {
    /** Parameters for socket paths that need them, like `'/my-path/:param1/:param2'`. */
    pathParams?: Record<string, string> | undefined;
    /**
     * A list of WebSocket protocols. This is the standard built-in argument for the `WebSocket`
     * constructor.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket#protocols
     */
    protocols?: string[];
    /**
     * Optional listeners that can be immediately attached to the WebSocket instance instead of
     * requiring externally adding them.
     */
    listeners?: ConnectSocketListeners<NoParam, WebSocketClass>;
    /**
     * A custom `WebSocket` constructor. Useful for debugging or unit testing. This can safely be
     * omitted to use the default JavaScript built-in global `WebSocket` class.
     *
     * @default globalThis.WebSocket
     */
    WebSocket?: Constructor<WebSocketClass>;
};

/**
 * Overwrites WebSocket methods with their rest-vir, type-safe replacements.
 *
 * WARNING: this mutates the input WebSocket.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function overwriteWebSocketMethods<
    const SocketToConnect extends Socket | NoParam,
    const WebSocketClass extends CommonWebSocket,
    const Location extends WebSocketLocation,
>(
    socket: SocketToConnect extends NoParam ? Socket : SocketToConnect,
    rawWebSocket: Readonly<WebSocketClass>,
    socketLocation: Location,
): OverwriteWebSocketMethods<WebSocketClass, Location, SocketToConnect> {
    const originalSend = rawWebSocket.send;
    const originalAddEventListener = rawWebSocket.addEventListener;
    const originalRemoveEventListener = rawWebSocket.removeEventListener;

    const webSocket = rawWebSocket as unknown as OverwriteWebSocketMethods<
        WebSocketClass,
        Location,
        SocketToConnect
    >;

    const originalListenerMap: Record<string, WeakMap<AnyFunction, AnyFunction>> = {};

    Object.assign(webSocket, {
        originalListenerMap,
        addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
            this: CommonWebSocket,
            eventName: EventName,
            listener: (
                params: SocketListenerParams<
                    EventName,
                    NoParam,
                    FlipWebSocketLocation<Location>,
                    WebSocketClass
                >,
            ) => unknown,
        ) {
            function newListener(event: Values<CommonWebSocketEventMap>) {
                const baseParams: Omit<
                    Record<
                        keyof SocketListenerParams<
                            keyof CommonWebSocketEventMap,
                            NoParam,
                            FlipWebSocketLocation<Location>,
                            WebSocketClass
                        >,
                        unknown
                    >,
                    'message'
                > = {
                    event,
                    webSocket,
                    socket,
                };
                if (eventName === 'message') {
                    const message = verifySocketMessage(
                        socket,
                        parseJsonWithUndefined(
                            String((event as CommonWebSocketEventMap['message']).data),
                        ),
                        /**
                         * Flip the socket location because messages on the client `WebSocket` will
                         * come from the server and messages on the server `WebSocket` will come
                         * from the client.
                         */
                        getOppositeSocketLocation(socketLocation),
                    );
                    return listener({...baseParams, message} as AnyObject as SocketListenerParams<
                        EventName,
                        NoParam,
                        FlipWebSocketLocation<Location>,
                        WebSocketClass
                    >);
                } else {
                    return listener(
                        baseParams as AnyObject as SocketListenerParams<
                            EventName,
                            NoParam,
                            FlipWebSocketLocation<Location>,
                            WebSocketClass
                        >,
                    );
                }
            }

            getOrSet(originalListenerMap, eventName, () => new WeakMap()).set(
                listener,
                newListener,
            );

            return originalAddEventListener.call(webSocket, eventName, newListener);
        },
        removeEventListener(eventName: keyof CommonWebSocketEventMap, listener: AnyFunction) {
            const existing = originalListenerMap[eventName]?.get(listener);
            if (existing) {
                originalListenerMap[eventName]?.delete(listener);
                originalRemoveEventListener.call(webSocket, eventName, existing);
            }
        },
        async sendAndWaitForReply({
            message,
            timeout = {seconds: 10},
        }: SendAndWaitForReplyParams<Location> | undefined = {}) {
            const deferredReply = new DeferredPromise<any>();

            function listener({
                message,
            }: SocketListenerParams<
                'message',
                NoParam,
                FlipWebSocketLocation<Location>,
                WebSocketClass
            >) {
                if (!deferredReply.isSettled) {
                    deferredReply.resolve(message);
                }
            }
            setTimeout(
                () => {
                    if (!deferredReply.isSettled) {
                        deferredReply.reject('Timeout: got no reply from the host.');
                    }
                },
                convertDuration(timeout, {milliseconds: true}).milliseconds,
            );

            webSocket.addEventListener('message', listener);
            (webSocket.send as AnyFunction)(message);

            try {
                const reply = await deferredReply.promise;

                return reply;
            } finally {
                webSocket.removeEventListener('message', listener);
            }
        },
        send(message: any) {
            originalSend.call(
                webSocket,
                /** The extra `String()` wrapper is to convert `undefined` into `'undefined'`. */
                String(JSON.stringify(verifySocketMessage(socket, message, socketLocation))),
            );
        },
    });

    return webSocket;
}

/**
 * Waits for a WebSocket to reach to the open state.
 *
 * @category Socket
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function waitForOpenWebSocket(
    webSocket: Readonly<Pick<CommonWebSocket, 'readyState'>>,
) {
    const socketOpenedPromise = new DeferredPromise();

    await waitUntil.isTruthy(() => {
        /* node:coverage ignore next 3: there's no way to intentionally trigger this */
        if (webSocket.readyState === CommonWebSocketState.Closed) {
            socketOpenedPromise.reject('WebSocket closed while waiting for it to open.');
            return true;
        } else if (webSocket.readyState === CommonWebSocketState.Open) {
            socketOpenedPromise.resolve();
            return true;
        } else {
            return false;
        }
    });

    await socketOpenedPromise.promise;
}

/**
 * Overwrites WebSocket methods with the typed rest-vir replacements, attaches WebSocket listeners,
 * and waits for the WebSocket to be opened.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function finalizeWebSocket<
    const WebSocketToConnect extends Readonly<Socket> | NoParam,
    const WebSocketClass extends CommonWebSocket,
    const Location extends WebSocketLocation,
>(
    socket: WebSocketToConnect extends NoParam ? Socket : WebSocketToConnect,
    /** An already-constructed WebSocket instance. */
    webSocketInput: WebSocketClass,
    listeners: ConnectSocketListeners<NoParam, WebSocketClass> | undefined,
    location: Location,
): Promise<OverwriteWebSocketMethods<WebSocketClass, Location, WebSocketToConnect>> {
    const webSocket = overwriteWebSocketMethods<WebSocketToConnect, WebSocketClass, Location>(
        socket,
        webSocketInput,
        location,
    );

    if (listeners?.open) {
        webSocket.addEventListener('open', listeners.open);
    }
    if (listeners?.error) {
        webSocket.addEventListener('error', listeners.error);
    }
    if (listeners?.message) {
        webSocket.addEventListener('message', listeners.message);
    }
    if (listeners?.close) {
        webSocket.addEventListener('close', listeners.close);
    }

    await waitForOpenWebSocket(webSocketInput);

    return webSocket;
}

/**
 * Verifies that the given WebSocket message matches the defined expectations for the given message
 * source.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function verifySocketMessage<
    const SpecificSocket extends SelectFrom<
        Socket,
        {
            MessageFromHostType: true;
            messageFromServerShape: true;
            messageFromClientShape: true;
            path: true;
            service: {
                serviceName: true;
            };
        }
    >,
    Location extends WebSocketLocation,
>(
    socket: Readonly<SpecificSocket>,
    /** The raw message data. */
    message: any,
    /** The location from which the message was sent. */
    messageSentFrom: Location,
): SpecificSocket['MessageFromHostType'] {
    const shape =
        messageSentFrom === WebSocketLocation.OnClient
            ? socket.messageFromClientShape
            : socket.messageFromServerShape;

    if (shape) {
        assertValidShape(message, shape);
    } else if (message) {
        throw new TypeError(
            `Socket '${socket.path}' in service '${socket.service.serviceName}' does not expect any message data from the ${messageSentFrom === WebSocketLocation.OnClient ? 'client' : 'server'} but received it: ${stringify(message)}.`,
        );
    }

    return message;
}
