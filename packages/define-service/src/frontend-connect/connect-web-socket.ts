import {HttpMethod, RequiredKeysOf, SelectFrom} from '@augment-vir/common';
import {IsNever} from 'type-fest';
import {buildUrl} from 'url-vir';
import {PathParams} from '../endpoint/endpoint-path.js';
import {type NoParam} from '../util/no-param.js';
import type {CommonWebSocket} from '../web-socket/common-web-socket.js';
import {
    finalizeWebSocket,
    WebSocketLocation,
    type ClientWebSocket,
    type ConnectWebSocketListeners,
    type GenericConnectWebSocketParams,
    type OverwriteWebSocketMethods,
} from '../web-socket/overwrite-web-socket-methods.js';
import {type WebSocketDefinition} from '../web-socket/web-socket-definition.js';
import {buildEndpointUrl} from './fetch-endpoint.js';

/**
 * Builds a web socket URL.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function buildWebSocketUrl(
    socket: Readonly<
        SelectFrom<
            WebSocketDefinition,
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
    ]: CollapsedConnectWebSocketParams
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
 * Params for {@link connectWebSocket}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ConnectWebSocketParams<
    WebSocketToConnect extends Readonly<
        SelectFrom<
            WebSocketDefinition,
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
    listeners?: ConnectWebSocketListeners<WebSocketToConnect, WebSocketClass>;
} & (IsNever<PathParams<WebSocketToConnect['path']>> extends true
    ? {
          /** This socket has no path parameters to configure. */
          pathParams?: undefined;
      }
    : PathParams<WebSocketToConnect['path']> extends string
      ? {
            /** Required path params for this socket's path. */
            pathParams: Readonly<Record<PathParams<WebSocketToConnect['path']>, string>>;
        }
      : {
            /** This socket has no path parameters to configure. */
            pathParams?: undefined;
        }) &
    (AllowWebSocketMock extends true
        ? Pick<GenericConnectWebSocketParams<WebSocketClass>, 'protocols' | 'WebSocket'>
        : Pick<GenericConnectWebSocketParams<WebSocketClass>, 'protocols'>);

/**
 * Collapsed version of {@link ConnectWebSocketParams} for {@link connectWebSocket} that only
 * _requires_ an object parameter if the parameters object has any required keys.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type CollapsedConnectWebSocketParams<
    WebSocketToConnect extends
        | Readonly<
              SelectFrom<
                  WebSocketDefinition,
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
> = WebSocketToConnect extends NoParam
    ? [Readonly<GenericConnectWebSocketParams<WebSocketClass>>?]
    : Readonly<
            ConnectWebSocketParams<
                Exclude<WebSocketToConnect, NoParam>,
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
 * @category WebSocket
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function connectWebSocket<
    const WebSocketToConnect extends Readonly<WebSocketDefinition> | NoParam,
    WebSocketClass extends CommonWebSocket,
>(
    socket: WebSocketToConnect extends WebSocketDefinition
        ? WebSocketToConnect
        : Readonly<WebSocketDefinition>,
    ...params: CollapsedConnectWebSocketParams<WebSocketToConnect, true, WebSocketClass>
): Promise<ClientWebSocket<WebSocketToConnect, WebSocketClass>> {
    const [
        {WebSocket = globalThis.WebSocket, protocols, listeners} = {},
    ] = params;

    const url = buildWebSocketUrl(socket, ...(params as any));

    const clientWebSocket: OverwriteWebSocketMethods<
        WebSocketClass,
        WebSocketLocation.OnClient,
        WebSocketToConnect
    > = await finalizeWebSocket<WebSocketToConnect, WebSocketClass, WebSocketLocation.OnClient>(
        socket as any,
        new WebSocket(url, protocols) as WebSocketClass,
        listeners,
        WebSocketLocation.OnClient,
    );

    return clientWebSocket;
}
