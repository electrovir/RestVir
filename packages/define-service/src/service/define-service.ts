import {assert, check} from '@augment-vir/assert';
import {AnyObject, getObjectTypedEntries, mapObjectValues, stringify} from '@augment-vir/common';
import {assertValidShape, defineShape} from 'object-shape-tester';
import {type IsEqual, type SetRequired} from 'type-fest';
import {type EndpointPathBase} from '../endpoint/endpoint-path.js';
import {
    assertValidEndpoint,
    attachEndpointShapeTypeGetters,
    endpointInitShape,
    type Endpoint,
    type EndpointInit,
    type WithFinalEndpointProps,
} from '../endpoint/endpoint.js';
import {
    Socket,
    SocketInit,
    WithFinalSocketProps,
    assertValidSocket,
    attachSocketShapeTypeGetters,
    socketInitShape,
} from '../socket/socket.js';
import {type NoParam} from '../util/no-param.js';
import {type OriginRequirement} from '../util/origin.js';
import {MinimalService} from './minimal-service.js';
import {ensureServiceDefinitionError} from './service-definition.error.js';

/**
 * A string used for type errors triggered when an endpoint path is defined without a leading slash.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointMustStartWithSlashTypeError = 'ERROR: endpoint must start with a slash';

/**
 * Base type used for the right side of "extends" in type parameters for generic endpoint
 * definitions.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type BaseServiceEndpointsInit = Record<EndpointPathBase, EndpointInit>;

/**
 * Base type used for the right side of "extends" in type parameters for generic endpoint
 * definitions.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type BaseServiceSocketsInit = Record<EndpointPathBase, SocketInit>;

/**
 * Init for a service. This is used as an input to {@link defineService}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ServiceInit<
    ServiceName extends string,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam,
    SocketsInit extends BaseServiceSocketsInit | NoParam,
> = MinimalService<ServiceName> & {
    requiredOrigin: NonNullable<OriginRequirement>;
    sockets?: IsEqual<SocketsInit, NoParam> extends true
        ? Record<EndpointPathBase, SocketInit>
        : {
              [SocketPath in keyof SocketsInit]: SocketPath extends EndpointPathBase
                  ? SocketsInit[SocketPath]
                  : SocketPath extends EndpointMustStartWithSlashTypeError
                    ? /** Prevent EndpointMustStartWithSlashTypeError from being used as an endpoint path. */
                      never
                    : EndpointMustStartWithSlashTypeError;
          };
    endpoints?: IsEqual<EndpointsInit, NoParam> extends true
        ? Record<EndpointPathBase, EndpointInit>
        : {
              [EndpointPath in keyof EndpointsInit]: EndpointPath extends EndpointPathBase
                  ? EndpointsInit[EndpointPath]
                  : EndpointPath extends EndpointMustStartWithSlashTypeError
                    ? /** Prevent EndpointMustStartWithSlashTypeError from being used as an endpoint path. */
                      never
                    : EndpointMustStartWithSlashTypeError;
          };
};

/**
 * A fully defined service (without executable endpoint implementations).
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ServiceDefinition<
    ServiceName extends string = any,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam = NoParam,
    SocketsInit extends BaseServiceSocketsInit | NoParam = NoParam,
> = MinimalService<ServiceName> & {
    requiredOrigin: NonNullable<OriginRequirement>;
    /** Include the initial init object so a service can be composed. */
    init: SetRequired<
        ServiceInit<ServiceName, EndpointsInit, SocketsInit>,
        'endpoints' | 'sockets'
    >;
    sockets: SocketsInit extends NoParam
        ? {
              [SocketPath in EndpointPathBase]: Socket;
          }
        : {
              [SocketPath in keyof SocketsInit]: SocketPath extends EndpointPathBase
                  ? WithFinalSocketProps<SocketsInit[SocketPath], SocketPath>
                  : EndpointMustStartWithSlashTypeError;
          };
    endpoints: EndpointsInit extends NoParam
        ? {
              [EndpointPath in EndpointPathBase]: Endpoint;
          }
        : {
              [EndpointPath in keyof EndpointsInit]: EndpointPath extends EndpointPathBase
                  ? WithFinalEndpointProps<EndpointsInit[EndpointPath], EndpointPath>
                  : EndpointMustStartWithSlashTypeError;
          };
};

/**
 * The main entry point to the whole `@rest-vir/define-service` package. This function accepts a
 * {@link ServiceInit} object and returns a fully defined {@link ServiceDefinition}.
 *
 * @category Define Service
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function defineService<
    const ServiceName extends string,
    const EndpointsInit extends BaseServiceEndpointsInit,
    const SocketsInit extends BaseServiceSocketsInit,
>(
    serviceInit: ServiceInit<ServiceName, EndpointsInit, SocketsInit>,
): ServiceDefinition<ServiceName, EndpointsInit, SocketsInit> {
    const serviceDefinition = finalizeServiceDefinition(serviceInit);
    assertValidServiceDefinition(serviceDefinition);
    return serviceDefinition;
}

function finalizeServiceDefinition<
    const ServiceName extends string,
    const EndpointsInit extends BaseServiceEndpointsInit,
    const SocketsInit extends BaseServiceSocketsInit,
>(
    serviceInit: ServiceInit<ServiceName, EndpointsInit, SocketsInit>,
): ServiceDefinition<ServiceName, EndpointsInit, SocketsInit> {
    try {
        const minimalService: MinimalService<ServiceName> = {
            serviceName: serviceInit.serviceName,
            serviceOrigin: serviceInit.serviceOrigin,
            requiredOrigin: serviceInit.requiredOrigin,
        };

        /**
         * Make the types less strict because we don't care what they are inside of this function's
         * implementation. Just the return type is what matters.
         */
        const genericEndpoints = (serviceInit.endpoints || {}) as BaseServiceEndpointsInit;

        const endpoints = mapObjectValues(genericEndpoints, (endpointPath, endpointInit) => {
            assertValidShape(endpointInit, endpointInitShape);
            const endpoint = {
                ...endpointInit,
                requestDataShape: endpointInit.requestDataShape
                    ? defineShape<any, true>(endpointInit.requestDataShape, true)
                    : undefined,
                responseDataShape: endpointInit.responseDataShape
                    ? defineShape<any, true>(endpointInit.responseDataShape, true)
                    : undefined,
                endpointPath,
                service: minimalService,
            } satisfies Omit<Endpoint, 'ResponseType' | 'RequestType'>;

            attachEndpointShapeTypeGetters(endpoint);

            return endpoint;
        });

        const genericSockets = (serviceInit.sockets || {}) as BaseServiceSocketsInit;

        const sockets = mapObjectValues(genericSockets, (socketPath, socketInit) => {
            assertValidShape(socketInit, socketInitShape);
            const socket = {
                ...socketInit,
                messageDataShape: defineShape(socketInit.messageDataShape),
                service: minimalService,
                socketPath,
            } satisfies Omit<Socket, 'MessageType'>;

            attachSocketShapeTypeGetters(socket);

            return socket;
        });

        return {
            serviceName: serviceInit.serviceName,
            serviceOrigin: serviceInit.serviceOrigin,
            init: {
                ...serviceInit,
                sockets: (serviceInit.sockets || {}) as ServiceDefinition<
                    ServiceName,
                    EndpointsInit,
                    SocketsInit
                >['init']['sockets'],
                endpoints: (serviceInit.endpoints || {}) as ServiceDefinition<
                    ServiceName,
                    EndpointsInit,
                    SocketsInit
                >['init']['endpoints'],
            },
            sockets: sockets as AnyObject as ServiceDefinition<
                ServiceName,
                EndpointsInit,
                SocketsInit
            >['sockets'],
            requiredOrigin: serviceInit.requiredOrigin,
            /** As cast needed again to narrow the type (for the return value) after broadening it. */
            endpoints: endpoints as AnyObject as ServiceDefinition<
                ServiceName,
                EndpointsInit,
                SocketsInit
            >['endpoints'],
        };
    } catch (error) {
        throw ensureServiceDefinitionError(error, {
            path: undefined,
            serviceName: serviceInit.serviceName,
            routeType: undefined,
        });
    }
}

/**
 * Asserts that the given input is a valid {@link ServiceDefinition} instance.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @throws {@link ServiceDefinitionError} : if there is an issue
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function assertValidServiceDefinition(
    serviceDefinition: ServiceDefinition,
): asserts serviceDefinition is ServiceDefinition {
    try {
        if (!serviceDefinition.serviceName || !check.isString(serviceDefinition.serviceName)) {
            throw new Error(
                `Invalid service name: '${stringify(serviceDefinition.serviceName)}'. Expected a non-empty string.`,
            );
        }

        assert.isDefined(serviceDefinition.requiredOrigin);

        getObjectTypedEntries(serviceDefinition.endpoints).forEach(
            ([
                ,
                endpoint,
            ]) => {
                assertValidEndpoint(endpoint, {
                    serviceName: serviceDefinition.serviceName,
                });
            },
        );

        getObjectTypedEntries(serviceDefinition.sockets).forEach(
            ([
                ,
                socket,
            ]) => {
                assertValidSocket(socket, {
                    serviceName: serviceDefinition.serviceName,
                });
            },
        );
    } catch (error) {
        throw ensureServiceDefinitionError(error, {
            path: undefined,
            serviceName: serviceDefinition.serviceName,
            routeType: undefined,
        });
    }
}
