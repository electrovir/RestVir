import {
    ensureErrorAndPrependMessage,
    HttpMethod,
    RequiredKeysOf,
    SelectFrom,
} from '@augment-vir/common';
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
import {parseSecWebSocketProtocolHeader} from './web-socket-protocol-parse.js';

/**
 * Verifies that no WebSocket protocols in the given list are invalid. This doesn't have anything to
 * do with a `WebsocketDefinition` instance, it's just checking if the given protocols can even be
 * sent.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function assertValidWebSocketProtocols(protocols: ReadonlyArray<unknown> | undefined) {
    if (!protocols || !protocols.length) {
        return;
    }
    const joinedProtocols = protocols.join(', ');
    try {
        parseSecWebSocketProtocolHeader(joinedProtocols);
    } catch (error) {
        throw ensureErrorAndPrependMessage(error, `Invalid protocols given ('${joinedProtocols}')`);
    }
}

/**
 * Builds a WebSocket URL.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function buildWebSocketUrl(
    webSocketDefinition: Readonly<
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
            path: webSocketDefinition.path,
            requestDataShape: undefined,
            responseDataShape: undefined,
            service: webSocketDefinition.service,
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
                protocolsShape: true;
                ProtocolsType: true;
                searchParamsShape: true;
                SearchParamsType: true;
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
          /** This WebSocket has no path parameters to configure. */
          pathParams?: undefined;
      }
    : PathParams<WebSocketToConnect['path']> extends string
      ? {
            /** Required path params for this WebSocket's path. */
            pathParams: Readonly<Record<PathParams<WebSocketToConnect['path']>, string>>;
        }
      : {
            /** This WebSocket has no path parameters to configure. */
            pathParams?: undefined;
        }) &
    (AllowWebSocketMock extends true
        ? Pick<GenericConnectWebSocketParams<WebSocketClass>, 'webSocketConstructor'>
        : unknown) &
    (WebSocketToConnect['protocolsShape'] extends undefined
        ? {
              protocols?: string[];
          }
        : {
              protocols: WebSocketToConnect['ProtocolsType'];
          }) &
    (WebSocketToConnect['searchParamsShape'] extends undefined
        ? {
              searchParams?: string[];
          }
        : {
              searchParams: WebSocketToConnect['SearchParamsType'];
          });

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
                      protocolsShape: true;
                      ProtocolsType: true;
                      searchParamsShape: true;
                      SearchParamsType: true;
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

const defaultWebSocket = function (
    this: any,
    ...[
        url,
        protocols,
    ]: ConstructorParameters<
        NonNullable<GenericConnectWebSocketParams<globalThis.WebSocket>['webSocketConstructor']>
    >
): WebSocket {
    return new globalThis.WebSocket(url, protocols);
} as unknown as NonNullable<
    GenericConnectWebSocketParams<globalThis.WebSocket>['webSocketConstructor']
>;

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
    webSocketDefinition: WebSocketToConnect extends WebSocketDefinition
        ? WebSocketToConnect
        : Readonly<WebSocketDefinition>,
    ...params: CollapsedConnectWebSocketParams<WebSocketToConnect, true, WebSocketClass>
): Promise<ClientWebSocket<WebSocketToConnect, WebSocketClass>> {
    const [
        {webSocketConstructor = defaultWebSocket, protocols, listeners} = {},
    ] = params;

    assertValidWebSocketProtocols(protocols);

    const url = buildWebSocketUrl(webSocketDefinition, ...(params as any));

    const clientWebSocket: OverwriteWebSocketMethods<
        WebSocketClass,
        WebSocketLocation.OnClient,
        WebSocketToConnect
    > = await finalizeWebSocket<WebSocketToConnect, WebSocketClass, WebSocketLocation.OnClient>(
        webSocketDefinition as any,
        new webSocketConstructor(url, protocols, webSocketDefinition) as WebSocketClass,
        listeners,
        WebSocketLocation.OnClient,
    );

    return clientWebSocket;
}
