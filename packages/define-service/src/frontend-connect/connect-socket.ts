import {HttpMethod, RequiredKeysOf, SelectFrom} from '@augment-vir/common';
import {IsNever} from 'type-fest';
import {buildUrl} from 'url-vir';
import {PathParams} from '../endpoint/endpoint-path.js';
import type {CommonWebSocket} from '../socket/common-web-socket.js';
import {
    finalizeWebSocket,
    WebSocketLocation,
    type ClientWebSocket,
    type ConnectSocketListeners,
    type GenericConnectSocketParams,
    type OverwriteWebSocketMethods,
} from '../socket/overwrite-socket-methods.js';
import {type Socket} from '../socket/socket.js';
import {type NoParam} from '../util/no-param.js';
import {buildEndpointUrl} from './fetch-endpoint.js';

/**
 * Builds a web socket URL.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function buildSocketUrl(
    socket: Readonly<
        SelectFrom<
            Socket,
            {
                path: true;
                service: {
                    serviceName: true;
                    serviceOrigin: true;
                };
            }
        >
    >,
    ...[
        {pathParams} = {},
    ]: CollapsedConnectSocketParams
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

/**
 * Params for {@link connectSocket}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ConnectSocketParams<
    SocketToConnect extends Readonly<
        SelectFrom<
            Socket,
            {
                path: true;
                MessageFromClientType: true;
                MessageFromHostType: true;
            }
        >
    >,
    AllowWebSocketMock extends boolean = true,
    WebSocketClass extends CommonWebSocket = CommonWebSocket,
> = {
    /**
     * Optional listeners that can be immediately attached to the WebSocket instance instead of
     * requiring externally adding them.
     */
    listeners?: ConnectSocketListeners<SocketToConnect, WebSocketClass>;
} & (IsNever<PathParams<SocketToConnect['path']>> extends true
    ? {
          /** This socket has no path parameters to configure. */
          pathParams?: undefined;
      }
    : PathParams<SocketToConnect['path']> extends string
      ? {
            /** Required path params for this socket's path. */
            pathParams: Readonly<Record<PathParams<SocketToConnect['path']>, string>>;
        }
      : {
            /** This socket has no path parameters to configure. */
            pathParams?: undefined;
        }) &
    (AllowWebSocketMock extends true
        ? Pick<GenericConnectSocketParams<WebSocketClass>, 'protocols' | 'WebSocket'>
        : Pick<GenericConnectSocketParams<WebSocketClass>, 'protocols'>);

/**
 * Collapsed version of {@link ConnectSocketParams} for {@link connectSocket} that only _requires_ an
 * object parameter if the parameters object has any required keys.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type CollapsedConnectSocketParams<
    SocketToConnect extends
        | Readonly<
              SelectFrom<
                  Socket,
                  {
                      path: true;
                      MessageFromClientType: true;
                      MessageFromHostType: true;
                  }
              >
          >
        | NoParam = NoParam,
    AllowWebSocketMock extends boolean = true,
    WebSocketClass extends CommonWebSocket = CommonWebSocket,
> = SocketToConnect extends NoParam
    ? [Readonly<GenericConnectSocketParams<WebSocketClass>>?]
    : Readonly<
            ConnectSocketParams<
                Exclude<SocketToConnect, NoParam>,
                AllowWebSocketMock,
                WebSocketClass
            >
        > extends infer RealParams
      ? RequiredKeysOf<RealParams> extends never
          ? [RealParams?]
          : [RealParams]
      : [];

/**
 * Creates and connects a new client WebSocket instance with type safety.
 *
 * @category Socket
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function connectSocket<
    const SocketToConnect extends Readonly<Socket> | NoParam,
    WebSocketClass extends CommonWebSocket,
>(
    socket: SocketToConnect extends Socket ? SocketToConnect : Readonly<Socket>,
    ...params: CollapsedConnectSocketParams<SocketToConnect, true, WebSocketClass>
): Promise<ClientWebSocket<SocketToConnect, WebSocketClass>> {
    const [
        {WebSocket = globalThis.WebSocket, protocols, listeners} = {},
    ] = params;

    const url = buildSocketUrl(socket, ...(params as any));

    const clientWebSocket: OverwriteWebSocketMethods<
        WebSocketClass,
        WebSocketLocation.OnClient,
        SocketToConnect
    > = await finalizeWebSocket<SocketToConnect, WebSocketClass, WebSocketLocation.OnClient>(
        socket as any,
        new WebSocket(url, protocols) as WebSocketClass,
        listeners,
        WebSocketLocation.OnClient,
    );

    return clientWebSocket;
}
