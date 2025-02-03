import {check} from '@augment-vir/assert';
import {
    type MaybePromise,
    filterMap,
    getObjectTypedEntries,
    getObjectTypedKeys,
} from '@augment-vir/common';
import {
    type BaseServiceSocketsInit,
    type EndpointPathBase,
    type MinimalService,
    type NoParam,
    type ServiceDefinition,
    ServiceDefinitionError,
    type Socket,
    type SocketInit,
    type WithFinalSocketProps,
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
export type SocketImplementation<
    Context = any,
    ServiceName extends string = any,
    SpecificSocket extends Socket | NoParam = NoParam,
> = Partial<{
    /** This will be called when the socket is connected and created. */
    onConnection: (
        params: SocketImplementationParams<Context, ServiceName, SpecificSocket, false>,
    ) => MaybePromise<void>;
    /**
     * This will be called on every received socket message.
     *
     * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-message
     */
    onMessage: (
        params: SocketImplementationParams<Context, ServiceName, SpecificSocket, true>,
    ) => MaybePromise<void>;
    /**
     * This will be called when the socket is closed.
     *
     * @see https://github.com/websockets/ws/blob/HEAD/doc/ws.md#event-close-1
     */
    onClose: (
        params: SocketImplementationParams<Context, ServiceName, SpecificSocket, false>,
    ) => MaybePromise<void>;
}>;

/**
 * Parameters for event callbacks in {@link SocketImplementation}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type SocketImplementationParams<
    Context = any,
    ServiceName extends string = any,
    SpecificSocket extends Socket | NoParam = NoParam,
    WithMessage extends boolean = boolean,
> = {
    context: Context;
    webSocket: ServerWebSocket<SpecificSocket>;
    socketDefinition: IsEqual<Extract<SpecificSocket, NoParam>, NoParam> extends true
        ? Socket
        : SpecificSocket;
    log: Readonly<ServiceLogger>;
    service: MinimalService<ServiceName>;
    headers: IncomingHttpHeaders;
    request: ServerRequest;
} & (IsEqual<WithMessage, true> extends true
    ? {
          message: SpecificSocket extends NoParam
              ? any
              : Exclude<SpecificSocket, NoParam>['MessageFromClientType'];
      }
    : unknown);

/**
 * All sockets implementations to match the service definition's sockets.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type SocketImplementations<
    Context = any,
    ServiceName extends string = any,
    SocketsInit extends BaseServiceSocketsInit | NoParam = NoParam,
> = SocketsInit extends NoParam
    ? Record<EndpointPathBase, SocketImplementation>
    : {
          [SocketPath in keyof SocketsInit]: SocketsInit[SocketPath] extends SocketInit
              ? SocketPath extends EndpointPathBase
                  ? SocketImplementation<
                        Context,
                        ServiceName,
                        WithFinalSocketProps<SocketsInit[SocketPath], SocketPath>
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
export function assertValidSocketImplementations(
    service: Pick<ServiceDefinition, 'sockets' | 'serviceName'>,
    socketImplementations: SocketImplementations,
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
            errorMessage: `Sockets implementations are not functions for:\n${invalidFunctionsString}`,
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
            errorMessage: `Sockets are missing implementations: '${missingImplementationPaths.join(
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
            errorMessage: `Socket implementations have extra paths: '${extraImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            endpoint: undefined,
            socket: undefined,
        });
    }
}
