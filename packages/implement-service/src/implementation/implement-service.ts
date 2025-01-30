import {assert} from '@augment-vir/assert';
import {
    mapObjectValues,
    type AnyObject,
    type KeyCount,
    type MaybePromise,
} from '@augment-vir/common';
import {
    BaseServiceEndpointsInit,
    EndpointPathBase,
    NoParam,
    ServiceDefinition,
    type BaseServiceSocketsInit,
    type Endpoint,
    type Socket,
} from '@rest-vir/define-service';
import type {IsEqual, OmitIndexSignature} from 'type-fest';
import {
    createServiceLogger,
    ServiceLoggerOption,
    silentServiceLogger,
    type ServiceLogger,
} from '../util/service-logger.js';
import type {ImplementedEndpoint, ImplementedSocket} from './generic-service-implementation.js';
import type {ContextInit, EndpointImplementations} from './implement-endpoint.js';
import {assertValidEndpointImplementations} from './implement-endpoint.js';
import {assertValidSocketImplementations, SocketImplementations} from './implement-socket.js';

/**
 * A user-defined endpoint error handler for service (and its endpoints) errors.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type CustomErrorHandler = (error: Error) => MaybePromise<void>;

/**
 * Type-safe input for {@link implementService}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServiceImplementationInit<Context> = {
    /**
     * Logger for the service. Use {@link silentServiceLogger} to disable logging entirely (even
     * errors) or simply set `undefined` to the log type that you wish to suppress. An omitted log
     * keys will fallback to the efault logger.
     */
    logger?: ServiceLoggerOption;
} & (IsEqual<Context, undefined> extends true
    ? {context?: undefined}
    : {context: ContextInit<Context>});

/**
 * Parameters for implementations for {@link implementService}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServiceImplementationsParams<
    Context,
    ServiceName extends string,
    EndpointsInit extends BaseServiceEndpointsInit,
    SocketsInit extends BaseServiceSocketsInit,
> = (KeyCount<OmitIndexSignature<EndpointsInit>> extends 0
    ? {
          endpoints?: never;
      }
    : {
          endpoints: EndpointImplementations<
              NoInfer<Context>,
              NoInfer<ServiceName>,
              NoInfer<EndpointsInit>
          >;
      }) &
    (KeyCount<OmitIndexSignature<SocketsInit>> extends 0
        ? {
              sockets?: never;
          }
        : {
              sockets: SocketImplementations<
                  NoInfer<Context>,
                  NoInfer<ServiceName>,
                  NoInfer<SocketsInit>
              >;
          });

/**
 * Creates an implemented service that is fully ready to be run as a server by attaching endpoint
 * implementations to the given {@link ServiceDefinition}.
 *
 * This can _only_ be run in backend code.
 *
 * @category Implement Service
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function implementService<
    const Context,
    const ServiceName extends string,
    const EndpointsInit extends BaseServiceEndpointsInit,
    const SocketsInit extends BaseServiceSocketsInit,
>(
    service: ServiceDefinition<ServiceName, EndpointsInit, SocketsInit>,
    /** Init must be first so that TypeScript can infer the type for `Context`. */
    init: ServiceImplementationInit<Context>,
    {
        endpoints: endpointImplementations,
        sockets: socketImplementations,
    }: ServiceImplementationsParams<
        NoInfer<Context>,
        NoInfer<ServiceName>,
        NoInfer<EndpointsInit>,
        NoInfer<SocketsInit>
    >,
): ServiceImplementation<Context, ServiceName, EndpointsInit> {
    assertValidEndpointImplementations(service, endpointImplementations || {});
    assertValidSocketImplementations(service, socketImplementations || {});

    const endpoints = mapObjectValues(service.endpoints, (endpointPath, endpoint) => {
        const implementation = endpointImplementations?.[endpointPath as EndpointPathBase];

        assert.isDefined(implementation);
        assert.isNotString(implementation);

        /**
         * Note: this return object is actually wrong. The service property will not be correct as
         * the `endpoint` here only has the minimal service. Below, after `serviceImplementation` is
         * created, we attach the correct service to all endpoints.
         */
        return {
            ...(endpoint as Endpoint),
            implementation,
        } satisfies Omit<ImplementedEndpoint, 'service'>;
    }) as AnyObject as ServiceImplementation<
        Context,
        ServiceName,
        EndpointsInit,
        SocketsInit
    >['endpoints'];

    const sockets = mapObjectValues(service.sockets, (socketPath, socket) => {
        const implementation = socketImplementations?.[socketPath as EndpointPathBase];

        assert.isDefined(implementation);
        assert.isNotString(socket);

        /**
         * Note: this return object is actually wrong. The service property will not be correct as
         * the `socket` here only has the minimal service. Below, after `serviceImplementation` is
         * created, we attach the correct service to all sockets.
         */
        return {
            ...(socket as Socket),
            implementation,
        } satisfies Omit<ImplementedSocket, 'service'>;
    }) as AnyObject as ServiceImplementation<
        Context,
        ServiceName,
        EndpointsInit,
        SocketsInit
    >['sockets'];

    const serviceImplementation: ServiceImplementation<Context, ServiceName, EndpointsInit> = {
        ...service,
        endpoints,
        sockets,
        context: init.context as ContextInit<Context>,
        logger: createServiceLogger(init.logger),
    };

    Object.values(endpoints).forEach((endpoint) => {
        endpoint.service = serviceImplementation;
    });
    Object.values(sockets).forEach((socket) => {
        socket.service = serviceImplementation;
    });

    return serviceImplementation;
}

/**
 * A finalized service implementation created by {@link implementService}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServiceImplementation<
    Context = any,
    ServiceName extends string = any,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam = NoParam,
    SocketsInit extends BaseServiceSocketsInit | NoParam = NoParam,
> = Omit<ServiceDefinition<ServiceName, EndpointsInit, SocketsInit>, 'endpoints'> & {
    endpoints: {
        [EndpointPath in keyof ServiceDefinition<
            ServiceName,
            EndpointsInit
        >['endpoints']]: EndpointPath extends EndpointPathBase
            ? ImplementedEndpoint<
                  Context,
                  ServiceName,
                  ServiceDefinition<ServiceName, EndpointsInit>['endpoints'][EndpointPath]
              >
            : never;
    };
    sockets: {
        [SocketPath in keyof ServiceDefinition<
            ServiceName,
            EndpointsInit
        >['sockets']]: SocketPath extends EndpointPathBase
            ? ImplementedSocket<
                  Context,
                  ServiceName,
                  ServiceDefinition<ServiceName, EndpointsInit>['sockets'][SocketPath]
              >
            : never;
    };
    context: ContextInit<Context>;
    logger: ServiceLogger;
};

/**
 * A type util that converts a {@link ServiceDefinition} instance type into its companion
 * {@link ServiceImplementation} type.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServiceImplementationFromServiceDefinition<
    SpecificServiceDefinition extends ServiceDefinition,
> =
    SpecificServiceDefinition extends ServiceDefinition<
        infer ServiceName,
        infer EndpointDefinitions
    >
        ? ServiceImplementation<unknown, ServiceName, EndpointDefinitions>
        : 'ERROR: Failed to infer service definition type parameters';
