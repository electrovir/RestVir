import {
    DeferredPromise,
    HttpMethod,
    RequiredKeysOf,
    SelectFrom,
    type MaybePromise,
    type Overwrite,
} from '@augment-vir/common';
import {assertValidShape} from 'object-shape-tester';
import {IsNever} from 'type-fest';
import {buildUrl} from 'url-vir';
import {PathParams} from '../endpoint/endpoint-path.js';
import {type Socket} from '../socket/socket.js';
import {type NoParam} from '../util/no-param.js';
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
        | NoParam,
> = globalThis.WebSocket & {
    send(
        message: SocketToConnect extends NoParam
            ? any
            : Exclude<SocketToConnect, NoParam>['MessageFromClientType'],
    ): void;
};
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
> = {
    [EventName in keyof WebSocketEventMap]: (
        params: SocketListenerParams<EventName, SocketToConnect>,
    ) => MaybePromise<void>;
};

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

export async function connectSocket<
    const SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      path: true;
                      MessageFromClientType: true;
                      MessageFromServerType: true;
                      messageFromClientShape: true;
                  }
              >
          >
        | NoParam,
>(
    socket: SocketToConnect extends Socket
        ? SocketToConnect
        : Readonly<
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
        {WebSocket = globalThis.WebSocket, pathParams, protocols, listeners} = {},
    ]: CollapsedConnectSocketParams<SocketToConnect>
): Promise<
    ClientWebSocket<
        SocketToConnect extends NoParam
            ? any
            : Exclude<SocketToConnect, NoParam>['MessageFromClientType']
    >
> {
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

    const url = buildUrl(httpUrl, {
        protocol: httpUrl.startsWith('https') ? 'wss' : 'ws',
    }).href;

    const webSocket: ClientWebSocket<Exclude<SocketToConnect, NoParam>['MessageFromClientType']> =
        new WebSocket(url, protocols);

    const originalSend = webSocket.send;

    Object.assign(webSocket, {
        send(message?: Exclude<SocketToConnect, NoParam>['MessageFromClientType']) {
            if (socket.messageFromClientShape) {
                assertValidShape(message, socket.messageFromClientShape);
            } else if (message) {
                throw new TypeError(
                    `Socket '${socket.path}' in service '${socket.service.serviceName}' does not allow any message data.`,
                );
            }

            originalSend.call(webSocket, message as any);
        },
    });

    const socketOpenPromise = new DeferredPromise();

    webSocket.addEventListener('open', async (event) => {
        if (!socketOpenPromise.isSettled) {
            socketOpenPromise.resolve();
        }
        if (listeners?.open) {
            await listeners.open({event, webSocket});
        }
    });
    webSocket.addEventListener('error', async (event) => {
        if (!socketOpenPromise.isSettled) {
            socketOpenPromise.reject(event);
        }
        if (listeners?.error) {
            await listeners.error({event, webSocket});
        }
    });
    if (listeners?.message) {
        webSocket.addEventListener('message', async (event) => {
            if (socket.messageFromServerShape) {
                assertValidShape(event.data, socket.messageFromServerShape);
            }

            await listeners.message({event, webSocket});
        });
    }
    if (listeners?.close) {
        webSocket.addEventListener('close', async (event) => {
            await listeners.close({event, webSocket});
        });
    }

    return socketOpenPromise.promise.then(() => webSocket);
}
