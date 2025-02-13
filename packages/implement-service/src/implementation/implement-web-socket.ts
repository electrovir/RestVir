import {check} from '@augment-vir/assert';
import {
    type MaybePromise,
    filterMap,
    getObjectTypedEntries,
    getObjectTypedKeys,
} from '@augment-vir/common';
import {
    type BaseServiceWebSocketsInit,
    type EndpointPathBase,
    type MinimalService,
    type NoParam,
    type ServiceDefinition,
    ServiceDefinitionError,
    type WebSocketDefinition,
    type WebSocketInit,
    type WithFinalWebSocketProps,
} from '@rest-vir/define-service';
import {type IncomingHttpHeaders} from 'node:http';
import {type IsEqual} from 'type-fest';
import {type ServerRequest, type ServerWebSocket} from '../util/data.js';
import {type ServiceLogger} from '../util/service-logger.js';

/**
 * A socket implementation, with callbacks for WebSocket events.
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
    ? any
    : Partial<{
          /** This will be called when the socket is connected and created. */
          onConnection: (
              params: WebSocketImplementationParams<Context, ServiceName, SpecificWebSocket, false>,
          ) => MaybePromise<void>;
          /**
           * This will be called on every received socket message.
           *
           * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-message
           */
          onMessage: (
              params: WebSocketImplementationParams<Context, ServiceName, SpecificWebSocket, true>,
          ) => MaybePromise<void>;
          /**
           * This will be called when the socket is closed.
           *
           * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-close-1
           */
          onClose: (
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
    socketDefinition: IsEqual<Extract<SpecificWebSocket, NoParam>, NoParam> extends true
        ? WebSocketDefinition
        : SpecificWebSocket;
    log: Readonly<ServiceLogger>;
    service: MinimalService<ServiceName>;
    headers: IncomingHttpHeaders;
    request: ServerRequest;
    protocols: string[];
} & (IsEqual<WithMessage, true> extends true
    ? {
          message: SpecificWebSocket extends NoParam
              ? any
              : Exclude<SpecificWebSocket, NoParam>['MessageFromClientType'];
      }
    : unknown);

/**
 * All sockets implementations to match the service definition's sockets.
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
 * Asserts that all socket implementations are valid.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function assertValidWebSocketImplementations(
    service: Pick<ServiceDefinition, 'sockets' | 'serviceName'>,
    socketImplementations: WebSocketImplementations,
) {
    const nonFunctionImplementations = filterMap(
        getObjectTypedEntries(socketImplementations),
        ([
            socketPath,
            implementation,
        ]) => {
            const nonFunctionKeys = getObjectTypedKeys(implementation).filter((key) => {
                const callback = implementation[key];
                return callback && check.isNotFunction(callback as unknown);
            });

            if (nonFunctionKeys.length) {
                return {
                    path: socketPath,
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
            endpoint: undefined,
            socket: undefined,
        });
    }

    const missingImplementationPaths: string[] = [];
    const extraImplementationPaths: string[] = [];

    Object.keys(service.sockets).forEach((key) => {
        if (!(key in socketImplementations)) {
            missingImplementationPaths.push(key);
        }
    });

    Object.keys(socketImplementations).forEach((key) => {
        if (!(key in service.sockets)) {
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
            endpoint: undefined,
            socket: undefined,
        });
    }

    if (extraImplementationPaths.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `WebSocket implementations have extra paths: '${extraImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            endpoint: undefined,
            socket: undefined,
        });
    }
}
