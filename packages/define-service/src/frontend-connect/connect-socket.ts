import {
    DeferredPromise,
    HttpMethod,
    RequiredKeysOf,
    SelectFrom,
    stringify,
    wrapPromiseInTimeout,
    type MaybePromise,
    type Overwrite,
} from '@augment-vir/common';
import {AnyDuration} from '@date-vir/duration';
import {assertValidShape} from 'object-shape-tester';
import {IsNever} from 'type-fest';
import {buildUrl} from 'url-vir';
import {PathParams} from '../endpoint/endpoint-path.js';
import {type Socket} from '../socket/socket.js';
import {type NoParam} from '../util/no-param.js';
import {parseJsonWithUndefined} from '../util/parse-json-with-undefined.js';
import {buildEndpointUrl} from './fetch-endpoint.js';

export type ClientWebSocket<
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                  }
              >
          >
        | NoParam = NoParam,
> = Overwrite<
    globalThis.WebSocket,
    {
        send(
            message: SocketToConnect extends NoParam
                ? any
                : Exclude<SocketToConnect, NoParam>['MessageFromClientType'],
        ): void;
    }
>;
export type ClientWebSocketConstructor = typeof globalThis.WebSocket;

export type SocketListenerParams<
    EventName extends keyof WebSocketEventMap,
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromServerType: true;
                  }
              >
          >
        | NoParam,
> = {
    socket: SocketToConnect extends NoParam ? Readonly<Socket> : Readonly<SocketToConnect>;
    webSocket: ClientWebSocket<SocketToConnect>;
} & (EventName extends 'message'
    ? {
          event: Overwrite<
              WebSocketEventMap[EventName],
              {
                  data: SocketToConnect extends NoParam
                      ? any
                      : Exclude<SocketToConnect, NoParam>['MessageFromServerType'];
              }
          >;
          message: SocketToConnect extends NoParam
              ? any
              : Exclude<SocketToConnect, NoParam>['MessageFromServerType'];
      }
    : {
          event: WebSocketEventMap[EventName];
      });

export type ConnectSocketListeners<
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      MessageFromClientType: true;
                      MessageFromServerType: true;
                  }
              >
          >
        | NoParam,
> = SocketToConnect extends NoParam
    ? Partial<{
          [EventName in keyof WebSocketEventMap]: (
              params: SocketListenerParams<EventName, NoParam>,
          ) => MaybePromise<void>;
      }>
    : Partial<{
          [EventName in keyof WebSocketEventMap]: (
              params: SocketListenerParams<EventName, SocketToConnect>,
          ) => MaybePromise<void>;
      }>;

export type GenericConnectSocketParams = {
    pathParams?: Record<string, string> | undefined;
    protocols?: string | string[] | undefined;
    listeners?: ConnectSocketListeners<NoParam>;
    /**
     * A custom `WebSocket` constructor. Useful for debugging or unit testing. This can safely be
     * omitted to use the default JavaScript built-in global `WebSocket` class.
     *
     * @default globalThis.WebSocket
     */
    WebSocket?: typeof globalThis.WebSocket;
};

export function buildSocketUrl(
    socket: Readonly<
        SelectFrom<
            Socket,
            {
                path: true;
                MessageFromClientType: true;
                MessageFromServerType: true;
                service: {
                    serviceName: true;
                    serviceOrigin: true;
                };
                messageFromServerShape: true;
                messageFromClientShape: true;
            }
        >
    >,
    ...[
        {pathParams} = {},
    ]: CollapsedConnectSocketParams<NoParam>
): string {
    const httpUrl = buildEndpointUrl(
        {
            methods: {
                [HttpMethod.Get]: true,
            },
            path: socket.path,
            requestDataShape: undefined,
            responseDataShape: undefined,
            service: socket.service,
        },
        {pathParams},
    );

    return buildUrl(httpUrl, {
        protocol: httpUrl.startsWith('https') ? 'wss' : 'ws',
    }).href;
}

export type ConnectSocketParams<
    SocketToConnect extends Readonly<
        SelectFrom<
            Socket,
            {
                path: true;
                MessageFromClientType: true;
                MessageFromServerType: true;
            }
        >
    >,
    AllowWebSocketMock extends boolean = true,
> = {
    listeners?: ConnectSocketListeners<SocketToConnect>;
} & (IsNever<PathParams<SocketToConnect['path']>> extends true
    ? {
          /** This endpoint has no path parameters to configure. */
          pathParams?: undefined;
      }
    : PathParams<SocketToConnect['path']> extends string
      ? {
            pathParams: Readonly<Record<PathParams<SocketToConnect['path']>, string>>;
        }
      : {
            /** This endpoint has no path parameters to configure. */
            pathParams?: undefined;
        }) &
    (AllowWebSocketMock extends true
        ? Pick<GenericConnectSocketParams, 'protocols' | 'WebSocket'>
        : Pick<GenericConnectSocketParams, 'protocols'>);

export type CollapsedConnectSocketParams<
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      path: true;
                      MessageFromClientType: true;
                      MessageFromServerType: true;
                  }
              >
          >
        | NoParam,
    AllowWebSocketMock extends boolean = true,
> = SocketToConnect extends NoParam
    ? [Readonly<GenericConnectSocketParams>?]
    : Readonly<
            ConnectSocketParams<Exclude<SocketToConnect, NoParam>, AllowWebSocketMock>
        > extends infer RealParams
      ? RequiredKeysOf<RealParams> extends never
          ? [RealParams?]
          : [RealParams]
      : [];

export async function connectSocket<const SocketToConnect extends Readonly<Socket> | NoParam>(
    socket: SocketToConnect extends Socket ? SocketToConnect : Readonly<Socket>,
    ...params: CollapsedConnectSocketParams<SocketToConnect>
): Promise<
    ClientWebSocket<
        SocketToConnect extends NoParam
            ? any
            : Exclude<SocketToConnect, NoParam>['MessageFromClientType']
    >
> {
    const [
        {WebSocket = globalThis.WebSocket, protocols, listeners} = {},
    ] = params;

    const url = buildSocketUrl(socket, ...params);

    const webSocket: ClientWebSocket<SocketToConnect> = new WebSocket(url, protocols);

    return await finalizeClientWebSocket(socket, webSocket, listeners);
}

export type MinimalWebSocket = {
    send: globalThis.WebSocket['send'];
    addEventListener<const EventName extends keyof WebSocketEventMap>(
        this: MinimalWebSocket,
        eventName: EventName,
        listener: (event: WebSocketEventMap[EventName]) => unknown,
    ): unknown;
};

export async function waitForOpenWebSocket(webSocket: {
    addEventListener(eventName: 'open' | 'error', listener: (event: Event) => unknown): unknown;
}) {
    const socketOpenedPromise = new DeferredPromise();
    webSocket.addEventListener('open', () => {
        socketOpenedPromise.resolve();
    });

    webSocket.addEventListener('error', (event) => {
        if (!socketOpenedPromise.isSettled) {
            socketOpenedPromise.reject(event);
        }
    });

    await socketOpenedPromise.promise;
}

export async function sendWebSocketMessageAndWaitForResponse<const SpecificSocket extends Socket>(
    socket: SpecificSocket,
    webSocket: ClientWebSocket<SpecificSocket> | globalThis.WebSocket,
    messageToSendFirst: SpecificSocket['MessageFromClientType'],
    timeoutDuration: Readonly<AnyDuration> = {seconds: 10},
): Promise<SpecificSocket['MessageFromServerType']> {
    const messageFromServer = new DeferredPromise<SpecificSocket['MessageFromServerType']>();

    async function listenForMessage(event: MessageEvent) {
        try {
            messageFromServer.resolve(verifySocketMessageFromServer(socket, event));
        } catch (error) {
            messageFromServer.reject(error);
        }
    }
    webSocket.addEventListener('message', listenForMessage);

    webSocket.send(messageToSendFirst);

    const message = await wrapPromiseInTimeout(timeoutDuration, messageFromServer.promise);
    webSocket.removeEventListener('message', listenForMessage);

    return message;
}

export function overwriteWebSocketSend(
    socket: Socket,
    webSocket: Readonly<Pick<MinimalWebSocket, 'send'>>,
    socketLocation: 'in-client' | 'in-server',
) {
    const originalSend = webSocket.send;

    const shape =
        socketLocation === 'in-client'
            ? socket.messageFromClientShape
            : socket.messageFromServerShape;

    Object.assign(webSocket, {
        send(message: any) {
            if (shape) {
                assertValidShape(message, shape);
            } else if (message) {
                throw new TypeError(
                    `Socket '${socket.path}' in service '${socket.service.serviceName}' does not expect any client message data but received it: ${stringify(message)}.`,
                );
            }

            originalSend.call(webSocket, String(JSON.stringify(message)));
        },
    });
}

export async function finalizeClientWebSocket<
    const SocketToConnect extends Readonly<Socket> | NoParam,
>(
    socket: SocketToConnect extends Socket ? SocketToConnect : Readonly<Socket>,
    /**
     * An already-constructed WebSocket instance.
     *
     * In normal operating circumstances, this will be a browser-compatible
     * [`WebSocket`](https://developer.mozilla.org/docs/Web/API/WebSocket) instance. During tests
     * with a service not connected to a live system port, this will be a [`WebSocket`]() instance
     * from the [`'ws'` package](https://www.npmjs.com/package/ws).
     */
    webSocketInput: Readonly<MinimalWebSocket>,
    listeners: ConnectSocketListeners<NoParam> | undefined,
): Promise<
    ClientWebSocket<
        SocketToConnect extends NoParam
            ? any
            : Exclude<SocketToConnect, NoParam>['MessageFromClientType']
    >
> {
    overwriteWebSocketSend(socket, webSocketInput, 'in-client');

    const webSocket = webSocketInput as ClientWebSocket<SocketToConnect>;

    if (listeners?.open) {
        webSocket.addEventListener('open', async (event) => {
            if (listeners.open) {
                await listeners.open({event, webSocket, socket});
            }
        });
    }
    if (listeners?.error) {
        webSocket.addEventListener('error', async (event) => {
            if (listeners.error) {
                await listeners.error({event, webSocket, socket});
            }
        });
    }
    if (listeners?.message) {
        webSocket.addEventListener('message', async (event) => {
            const message = verifySocketMessageFromServer(socket, event);

            await listeners.message?.({event, webSocket, message, socket});
        });
    }
    if (listeners?.close) {
        webSocket.addEventListener('close', async (event) => {
            await listeners.close?.({event, webSocket, socket});
        });
    }

    await waitForOpenWebSocket(webSocket);

    return webSocket;
}

export function verifySocketMessageFromServer<const SpecificSocket extends Socket>(
    socket: SpecificSocket,
    event: MessageEvent,
): Promise<SpecificSocket['MessageFromServerType']> {
    const message = parseJsonWithUndefined(event.data);

    if (socket.messageFromServerShape) {
        assertValidShape(message, socket.messageFromServerShape);
    } else if (message) {
        throw new TypeError(
            `Socket '${socket.path}' in service '${socket.service.serviceName}' does not expect any server message data but received it: ${stringify(message)}.`,
        );
    }

    return message;
}
