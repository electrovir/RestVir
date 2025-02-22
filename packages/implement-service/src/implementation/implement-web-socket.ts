import {check} from '@augment-vir/assert';
import {
    type MaybePromise,
    filterMap,
    getObjectTypedEntries,
    getObjectTypedKeys,
} from '@augment-vir/common';
import {
    BaseSearchParams,
    BaseServiceWebSocketsInit,
    EndpointPathBase,
    MinimalService,
    NoParam,
    ServiceDefinition,
    ServiceDefinitionError,
    WebSocketDefinition,
    WebSocketInit,
    WithFinalWebSocketProps,
} from '@rest-vir/define-service';
import {type IncomingHttpHeaders} from 'node:http';
import {type IsEqual} from 'type-fest';
import {type ServerRequest, type ServerWebSocket} from '../util/data.js';
import {type ServiceLogger} from '../util/service-logger.js';

/**
 * A WebSocket implementation, with callbacks for WebSocket events.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type WebSocketImplementation<
    Context = any,
    ServiceName extends string = any,
    SpecificWebSocket extends WebSocketDefinition | NoParam = NoParam,
> = SpecificWebSocket extends NoParam
    ? Partial<{
          /** This will be called when the WebSocket is opened and created. */
          open: (params: any) => MaybePromise<void>;
          /**
           * This will be called on every received WebSocket message.
           *
           * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-message
           */
          message: (params: any) => MaybePromise<void>;
          /**
           * This will be called when the WebSocket is closed.
           *
           * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-close-1
           */
          close: (params: any) => MaybePromise<void>;
      }>
    : Partial<{
          /** This will be called when the WebSocket is opened and created. */
          open: (
              params: WebSocketImplementationParams<Context, ServiceName, SpecificWebSocket, false>,
          ) => MaybePromise<void>;
          /**
           * This will be called on every received WebSocket message.
           *
           * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-message
           */
          message: (
              params: WebSocketImplementationParams<Context, ServiceName, SpecificWebSocket, true>,
          ) => MaybePromise<void>;
          /**
           * This will be called when the WebSocket is closed.
           *
           * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-close-1
           */
          close: (
              params: WebSocketImplementationParams<Context, ServiceName, SpecificWebSocket, false>,
          ) => MaybePromise<void>;
      }>;

/**
 * Parameters for event callbacks in {@link WebSocketImplementation}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type WebSocketImplementationParams<
    Context = any,
    ServiceName extends string = any,
    SpecificWebSocket extends WebSocketDefinition | NoParam = NoParam,
    WithMessage extends boolean = boolean,
> = {
    context: Context;
    webSocket: ServerWebSocket<SpecificWebSocket>;
    webSocketDefinition: IsEqual<Extract<SpecificWebSocket, NoParam>, NoParam> extends true
        ? WebSocketDefinition
        : SpecificWebSocket;
    log: Readonly<ServiceLogger>;
    service: MinimalService<ServiceName>;
    headers: IncomingHttpHeaders;
    request: ServerRequest;
    protocols: SpecificWebSocket extends NoParam
        ? string[]
        : Exclude<SpecificWebSocket, NoParam>['ProtocolsType'];
    searchParams: SpecificWebSocket extends NoParam
        ? BaseSearchParams
        : Exclude<SpecificWebSocket, NoParam>['SearchParamsType'];
} & (IsEqual<WithMessage, true> extends true
    ? {
          message: SpecificWebSocket extends NoParam
              ? any
              : Exclude<SpecificWebSocket, NoParam>['MessageFromClientType'];
      }
    : unknown);

/**
 * All WebSockets implementations to match the service definition's WebSockets.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type WebSocketImplementations<
    Context = any,
    ServiceName extends string = any,
    WebSocketsInit extends BaseServiceWebSocketsInit | NoParam = NoParam,
> = WebSocketsInit extends NoParam
    ? Record<EndpointPathBase, WebSocketImplementation>
    : {
          [WebSocketPath in keyof WebSocketsInit]: WebSocketsInit[WebSocketPath] extends WebSocketInit
              ? WebSocketPath extends EndpointPathBase
                  ? WebSocketImplementation<
                        Context,
                        ServiceName,
                        WithFinalWebSocketProps<WebSocketsInit[WebSocketPath], WebSocketPath>
                    >
                  : never
              : never;
      };

/**
 * Asserts that all WebSocket implementations are valid.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function assertValidWebSocketImplementations(
    service: Pick<ServiceDefinition, 'webSockets' | 'serviceName'>,
    webSocketImplementations: WebSocketImplementations,
) {
    const nonFunctionImplementations = filterMap(
        getObjectTypedEntries(webSocketImplementations),
        ([
            webSocketPath,
            webSocketImplementation,
        ]) => {
            const nonFunctionKeys = getObjectTypedKeys(webSocketImplementation).filter((key) => {
                const callback = webSocketImplementation[key];
                return callback && check.isNotFunction(callback as unknown);
            });

            if (nonFunctionKeys.length) {
                return {
                    path: webSocketPath,
                    nonFunctionKeys,
                };
            } else {
                return undefined;
            }
        },
        check.isTruthy,
    );

    if (nonFunctionImplementations.length) {
        const invalidFunctionsString = nonFunctionImplementations
            .map(({nonFunctionKeys, path}) =>
                [
                    path,
                    nonFunctionKeys.join(','),
                ].join(': '),
            )
            .join(';\n');

        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `WebSockets implementations are not functions for:\n${invalidFunctionsString}`,
            serviceName: service.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
        });
    }

    const missingImplementationPaths: string[] = [];
    const extraImplementationPaths: string[] = [];

    Object.keys(service.webSockets).forEach((key) => {
        if (!(key in webSocketImplementations)) {
            missingImplementationPaths.push(key);
        }
    });

    Object.keys(webSocketImplementations).forEach((key) => {
        if (!(key in service.webSockets)) {
            extraImplementationPaths.push(key);
        }
    });

    if (missingImplementationPaths.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `WebSockets are missing implementations: '${missingImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
        });
    }

    if (extraImplementationPaths.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `WebSocket implementations have extra paths: '${extraImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
        });
    }
}
