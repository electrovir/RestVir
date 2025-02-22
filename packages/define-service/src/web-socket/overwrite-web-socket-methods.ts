import {waitUntil} from '@augment-vir/assert';
import {
    AnyObject,
    callAsynchronously,
    DeferredPromise,
    ensureErrorAndPrependMessage,
    getOrSet,
    MaybePromise,
    Overwrite,
    SelectFrom,
    stringify,
    wrapInTry,
    type AnyFunction,
    type Values,
} from '@augment-vir/common';
import {convertDuration, type AnyDuration} from 'date-vir';
import {assertValidShape} from 'object-shape-tester';
import type {HasRequiredKeys} from 'type-fest';
import {parseJsonWithUndefined} from '../augments/json.js';
import {NoParam} from '../util/no-param.js';
import {
    CommonWebSocket,
    CommonWebSocketEventMap,
    CommonWebSocketState,
} from './common-web-socket.js';
import {type WebSocketDefinition} from './web-socket-definition.js';

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
 * passing in `WebSocketLocation.OnHost` here will give you `WebSocketLocation.OnClient`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function getOppositeWebSocketLocation(
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
 * passing in `WebSocketLocation.OnHost` here will give you `WebSocketLocation.OnClient`.
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
        Pick<WebSocketDefinition, 'MessageFromClientType' | 'MessageFromHostType'>
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
    WebSocketToConnect extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam = NoParam,
> = (WebSocketToConnect extends NoParam
    ? {
          /** Generic message to send. */
          message?: any;
      }
    : GetWebSocketMessageTypeFromLocation<
            Exclude<WebSocketToConnect, NoParam>,
            Location
        > extends undefined
      ? {
            /** The message data to send to the other side of the WebSocket connection. */
            message?: GetWebSocketMessageTypeFromLocation<
                Exclude<WebSocketToConnect, NoParam>,
                Location
            >;
        }
      : {
            /** The message data to send to the other side of the WebSocket connection. */
            message: GetWebSocketMessageTypeFromLocation<
                Exclude<WebSocketToConnect, NoParam>,
                Location
            >;
        }) & {
    /**
     * The duration to wait for a reply message. If this duration is exceeded and a response still
     * hasn't been received, an error is thrown.
     *
     * @default {seconds: 10}
     */
    timeout?: Readonly<AnyDuration> | undefined;
    /**
     * An optional function to check if the current reply is the one you were waiting for.
     *
     * If this is set, `sendAndWaitForReply` will wait until a reply is received that matches this
     * condition. If this not set, the first reply is used.
     */
    replyCheck?: (
        messageFromHost: WebSocketToConnect extends NoParam
            ? any
            : Exclude<WebSocketToConnect, NoParam>['MessageFromHostType'],
    ) => MaybePromise<boolean>;
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
    WebSocketToConnect extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam = NoParam,
> =
    HasRequiredKeys<SendAndWaitForReplyParams<Location, WebSocketToConnect>> extends true
        ? [SendAndWaitForReplyParams<Location, WebSocketToConnect>]
        : [SendAndWaitForReplyParams<Location, WebSocketToConnect>?];

/**
 * Narrows a {@link WebSocketDefinition} for use within {@link OverwriteWebSocketMethods}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type NarrowOriginalDefinition<
    OriginalWebSocketDefinition extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                      SearchParamsType: true;
                  }
              >
          >
        | NoParam = NoParam,
> = OriginalWebSocketDefinition extends NoParam
    ? NoParam
    : Omit<
          OriginalWebSocketDefinition,
          /**
           * Omit connect so this is compatible with API WebSocket objects (which have a `connect`
           * method).
           */
          'connect'
      >;

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
    OriginalWebSocketDefinition extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                      SearchParamsType: true;
                  }
              >
          >
        | NoParam = NoParam,
> = Overwrite<
    WebSocketClass,
    {
        /**
         * Closes the WebSocket and waits it to actually close (so that you _know_ it's been closed
         * once this resolves).
         */
        close(): Promise<void>;
        /**
         * Adds an event listener that's wrapped in assertions to verify that message events have
         * the expected contents.
         */
        addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
            eventName: EventName,
            listener: WebSocketListener<
                EventName,
                NarrowOriginalDefinition<OriginalWebSocketDefinition>,
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
            ...params: CollapsedSendAndWaitForReplyParams<
                Location,
                NarrowOriginalDefinition<OriginalWebSocketDefinition>
            >
        ): Promise<
            NarrowOriginalDefinition<OriginalWebSocketDefinition> extends NoParam
                ? any
                : GetWebSocketMessageTypeFromLocation<
                      Exclude<NarrowOriginalDefinition<OriginalWebSocketDefinition>, NoParam>,
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
            ...args: NarrowOriginalDefinition<OriginalWebSocketDefinition> extends NoParam
                ? [message?: any]
                : GetWebSocketMessageTypeFromLocation<
                        Exclude<NarrowOriginalDefinition<OriginalWebSocketDefinition>, NoParam>,
                        Location
                    > extends undefined
                  ? [
                        message?: GetWebSocketMessageTypeFromLocation<
                            Exclude<NarrowOriginalDefinition<OriginalWebSocketDefinition>, NoParam>,
                            Location
                        >,
                    ]
                  : [
                        message: GetWebSocketMessageTypeFromLocation<
                            Exclude<NarrowOriginalDefinition<OriginalWebSocketDefinition>, NoParam>,
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
    WebSocketToConnect extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                      SearchParamsType: true;
                  }
              >
          >
        | NoParam = NoParam,
    WebSocketClass extends CommonWebSocket = CommonWebSocket,
> = OverwriteWebSocketMethods<WebSocketClass, WebSocketLocation.OnClient, WebSocketToConnect>;

/**
 * Parameters for a type-safe WebSocket listener callback. Used in {@link WebSocketListener}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WebSocketListenerParams<
    EventName extends keyof CommonWebSocketEventMap,
    WebSocketToConnect extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                      SearchParamsType: true;
                  }
              >
          >
        | NoParam,
    MessageSource extends WebSocketLocation,
    WebSocketClass extends CommonWebSocket,
> = {
    webSocketDefinition: WebSocketToConnect extends NoParam
        ? Readonly<
              Overwrite<
                  WebSocketDefinition,
                  /**
                   * This `Overwrite` is needed so that
                   * `CollapsedConnectWebSocketParams<ACTUAL_SOCKET>` can be assigned to
                   * `CollapsedConnectWebSocketParams<NoParam>`. Idk why.
                   */
                  {path: any; customProps: any}
              >
          >
        : Readonly<WebSocketToConnect>;
    webSocket: ClientWebSocket<WebSocketToConnect, WebSocketClass>;
} & (EventName extends 'message'
    ? {
          event: Overwrite<
              CommonWebSocketEventMap[EventName],
              {
                  data: WebSocketToConnect extends NoParam
                      ? any
                      : GetWebSocketMessageTypeFromLocation<
                            Exclude<WebSocketToConnect, NoParam>,
                            MessageSource
                        >;
              }
          >;
          searchParams: WebSocketToConnect extends NoParam
              ? any
              : Exclude<WebSocketToConnect, NoParam>['SearchParamsType'];
          message: WebSocketToConnect extends NoParam
              ? any
              : GetWebSocketMessageTypeFromLocation<
                    Exclude<WebSocketToConnect, NoParam>,
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
export type ConnectWebSocketListeners<
    WebSocketToConnect extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                      SearchParamsType: true;
                  }
              >
          >
        | NoParam,
    WebSocketClass extends CommonWebSocket,
> = Partial<{
    [EventName in keyof CommonWebSocketEventMap]: WebSocketListener<
        EventName,
        WebSocketToConnect,
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
export type WebSocketListener<
    EventName extends keyof CommonWebSocketEventMap,
    WebSocketToConnect extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
                  {
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                      SearchParamsType: true;
                  }
              >
          >
        | NoParam,
    MessageSource extends WebSocketLocation,
    WebSocketClass extends CommonWebSocket,
> = (
    params: WebSocketListenerParams<EventName, WebSocketToConnect, MessageSource, WebSocketClass>,
) => MaybePromise<void>;

/**
 * Generic connection parameters for `connectWebSocket`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type GenericConnectWebSocketParams<WebSocketClass extends CommonWebSocket> = {
    /** Parameters for WebSocket paths that need them, like `'/my-path/:param1/:param2'`. */
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
    listeners?: ConnectWebSocketListeners<NoParam, WebSocketClass>;
    /**
     * A custom `WebSocket` constructor. Useful for debugging or unit testing. This can safely be
     * omitted to use the default JavaScript built-in global `WebSocket` class.
     *
     * @default globalThis.WebSocket
     */
    webSocketConstructor?:
        | (new (
              url: string,
              protocols: string[] | undefined,
              webSocketDefinition: WebSocketDefinition,
          ) => WebSocketClass)
        | undefined;
    searchParams?: unknown;
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
    const WebSocketToConnect extends WebSocketDefinition | NoParam,
    const WebSocketClass extends CommonWebSocket,
    const Location extends WebSocketLocation,
>(
    webSocketDefinition: WebSocketToConnect extends NoParam
        ? WebSocketDefinition
        : WebSocketToConnect,
    rawWebSocket: Readonly<WebSocketClass>,
    webSocketLocation: Location,
): OverwriteWebSocketMethods<WebSocketClass, Location, WebSocketToConnect> {
    const originalSend = rawWebSocket.send;
    const originalClose = rawWebSocket.close;
    const originalAddEventListener = rawWebSocket.addEventListener;
    const originalRemoveEventListener = rawWebSocket.removeEventListener;

    const webSocket = rawWebSocket as unknown as OverwriteWebSocketMethods<
        WebSocketClass,
        Location,
        WebSocketToConnect
    >;

    const deferredClosePromise = new DeferredPromise();

    webSocket.addEventListener('close', () => {
        /**
         * Call this asynchronously so the other `close` event listeners get fired before this
         * resolves.
         */
        void callAsynchronously(() => {
            deferredClosePromise.resolve();
        });
    });

    const originalListenerMap: Record<string, WeakMap<AnyFunction, AnyFunction>> = {};

    Object.assign(webSocket, {
        originalListenerMap,
        async close() {
            originalClose.call(webSocket);
            /**
             * Closing takes a _long time_ for some reason, so we want to wait until it's actually
             * done before proceeding with other operations.
             */
            await deferredClosePromise.promise;
        },
        addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
            this: CommonWebSocket,
            eventName: EventName,
            listener: (
                params: WebSocketListenerParams<
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
                        keyof WebSocketListenerParams<
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
                    webSocketDefinition,
                };
                if (eventName === 'message') {
                    const message = verifyWebSocketMessage(
                        webSocketDefinition,
                        parseJsonWithUndefined(
                            String((event as CommonWebSocketEventMap['message']).data),
                        ),
                        /**
                         * Flip the WebSocket location because messages on the client WebSocket will
                         * come from the host and messages on the host WebSocket will come from the
                         * client.
                         */
                        getOppositeWebSocketLocation(webSocketLocation),
                    );
                    return listener({
                        ...baseParams,
                        message,
                    } as AnyObject as WebSocketListenerParams<
                        EventName,
                        NoParam,
                        FlipWebSocketLocation<Location>,
                        WebSocketClass
                    >);
                } else {
                    return listener(
                        baseParams as AnyObject as WebSocketListenerParams<
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
            replyCheck,
        }: SendAndWaitForReplyParams<Location> | undefined = {}) {
            const deferredReply = new DeferredPromise<any>();

            async function listener({
                message,
            }: WebSocketListenerParams<
                'message',
                NoParam,
                FlipWebSocketLocation<Location>,
                WebSocketClass
            >) {
                if (!deferredReply.isSettled) {
                    const matchesChecker = replyCheck
                        ? (await wrapInTry(() => replyCheck(message))) === true
                        : true;
                    if (matchesChecker) {
                        deferredReply.resolve(message);
                    }
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
                String(
                    JSON.stringify(
                        verifyWebSocketMessage(webSocketDefinition, message, webSocketLocation),
                    ),
                ),
            );
        },
    });

    return webSocket;
}

/**
 * Waits for a WebSocket to reach to the open state.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function waitForOpenWebSocket(
    webSocket: Readonly<
        Pick<CommonWebSocket, 'readyState' | 'addEventListener' | 'removeEventListener'>
    >,
) {
    const webSocketOpenedPromise = new DeferredPromise();

    function errorListener(error: unknown) {
        if (!webSocketOpenedPromise.isSettled) {
            webSocketOpenedPromise.reject(
                ensureErrorAndPrependMessage(error, 'WebSocket connection failed.'),
            );
        }
    }

    webSocket.addEventListener('error', errorListener);

    void waitUntil
        .isTruthy(
            () => {
                if (webSocketOpenedPromise.isSettled) {
                    return true;
                }

                if (webSocket.readyState === CommonWebSocketState.Closed) {
                    webSocketOpenedPromise.reject('WebSocket closed while waiting for it to open.');
                    return true;
                } else if (webSocket.readyState === CommonWebSocketState.Open) {
                    webSocketOpenedPromise.resolve();
                    return true;
                } else {
                    return false;
                }
            },
            undefined,
            'WebSocket never opened',
        )
        .catch((error: unknown) => {
            if (!webSocketOpenedPromise.isSettled) {
                webSocketOpenedPromise.reject(error);
            }
        });

    await webSocketOpenedPromise.promise.finally(() => {
        webSocket.removeEventListener('error', errorListener);
    });
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
    const WebSocketToConnect extends Readonly<WebSocketDefinition> | NoParam,
    const WebSocketClass extends CommonWebSocket,
    const Location extends WebSocketLocation,
>(
    webSocketDefinition: WebSocketToConnect extends NoParam
        ? WebSocketDefinition
        : WebSocketToConnect,
    /** An already-constructed WebSocket instance. */
    webSocketInput: WebSocketClass,
    listeners: ConnectWebSocketListeners<NoParam, WebSocketClass> | undefined,
    location: Location,
): Promise<OverwriteWebSocketMethods<WebSocketClass, Location, WebSocketToConnect>> {
    const webSocket = overwriteWebSocketMethods<WebSocketToConnect, WebSocketClass, Location>(
        webSocketDefinition,
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
export function verifyWebSocketMessage<
    const SpecificWebSocket extends SelectFrom<
        WebSocketDefinition,
        {
            MessageFromHostType: true;
            messageFromHostShape: true;
            messageFromClientShape: true;
            path: true;
            service: {
                serviceName: true;
            };
        }
    >,
    Location extends WebSocketLocation,
>(
    webSocketDefinition: Readonly<SpecificWebSocket>,
    /** The raw message data. */
    message: any,
    /** The location from which the message was sent. */
    messageSentFrom: Location,
): SpecificWebSocket['MessageFromHostType'] {
    const shape =
        messageSentFrom === WebSocketLocation.OnClient
            ? webSocketDefinition.messageFromClientShape
            : webSocketDefinition.messageFromHostShape;

    if (shape) {
        assertValidShape(message, shape, {
            allowExtraKeys: true,
        });
    } else if (message) {
        throw new TypeError(
            `WebSocket '${webSocketDefinition.path}' in service '${webSocketDefinition.service.serviceName}' does not expect any message data from the ${messageSentFrom === WebSocketLocation.OnClient ? 'client' : 'host'} but received it: ${stringify(message)}.`,
        );
    }

    return message;
}
