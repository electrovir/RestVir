import {check} from '@augment-vir/assert';
import {getObjectTypedEntries, mapObjectValues, type MaybePromise} from '@augment-vir/common';
import {
    BaseServiceEndpointsInit,
    EndpointPathBase,
    NoParam,
    ServiceDefinition,
    ServiceDefinitionError,
} from '@rest-vir/define-service';
import type {IsEqual} from 'type-fest';
import {
    createServiceLogger,
    ServiceLoggerOption,
    silentServiceLogger,
    type ServiceLogger,
} from '../util/service-logger.js';
import type {
    ContextInit,
    EndpointImplementations,
    ExtractAuth,
    ImplementedEndpoint,
} from './implement-endpoint.js';

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
export type ServiceImplementationInit<
    Context,
    AllowedAuth extends ReadonlyArray<any> | undefined,
> = {
    /**
     * Logger for the service. Use {@link silentServiceLogger} to disable logging entirely (even
     * errors) or simply set `undefined` to the log type that you wish to suppress. An omitted log
     * keys will fallback to the efault logger.
     */
    logger?: ServiceLoggerOption;
} & (IsEqual<Context, undefined> extends true
    ? {context?: undefined}
    : {context: ContextInit<Context>}) &
    (IsEqual<AllowedAuth, undefined> extends true
        ? {extractAuth?: undefined}
        : {extractAuth: ExtractAuth<Context, AllowedAuth>});

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
    const AllowedAuth extends ReadonlyArray<any> | undefined,
    const EndpointsInit extends BaseServiceEndpointsInit<AllowedAuth>,
>(
    service: ServiceDefinition<ServiceName, AllowedAuth, EndpointsInit>,
    endpointImplementations: EndpointImplementations<
        Context,
        NoInfer<ServiceName>,
        NoInfer<EndpointsInit>
    >,
    init: ServiceImplementationInit<Context, NoInfer<AllowedAuth>>,
): ServiceImplementation<Context, ServiceName, AllowedAuth, EndpointsInit> {
    assertValidEndpointImplementations(service, endpointImplementations);

    const endpoints = mapObjectValues(service.endpoints, (endpointPath, endpoint) => {
        const implementation = endpointImplementations[endpointPath as EndpointPathBase];

        /**
         * Note: this return object is actually wrong. The service property will not be correct as
         * the `endpoint` here only has the minimal service. Below, after `serviceImplementation` is
         * created, we attach the correct service to all endpoints.
         */
        return {
            ...endpoint,
            implementation,
        };
    }) as ServiceImplementation<Context, ServiceName, AllowedAuth, EndpointsInit>['endpoints'];

    const serviceImplementation: ServiceImplementation<
        Context,
        ServiceName,
        AllowedAuth,
        EndpointsInit
    > = {
        ...service,
        endpoints,
        context: init.context as ContextInit<Context>,
        extractAuth: init.extractAuth,
        logger: createServiceLogger(init.logger),
    };

    Object.values(endpoints).forEach((endpoint) => {
        endpoint.service = serviceImplementation;
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
    AllowedAuth extends ReadonlyArray<any> | undefined = any,
    EndpointsInit extends BaseServiceEndpointsInit<AllowedAuth> | NoParam = NoParam,
> = Omit<ServiceDefinition<ServiceName, AllowedAuth, EndpointsInit>, 'endpoints'> & {
    endpoints: {
        [EndpointPath in keyof ServiceDefinition<
            ServiceName,
            AllowedAuth,
            EndpointsInit
        >['endpoints']]: EndpointPath extends EndpointPathBase
            ? ImplementedEndpoint<
                  Context,
                  ServiceName,
                  ServiceDefinition<
                      ServiceName,
                      AllowedAuth,
                      EndpointsInit
                  >['endpoints'][EndpointPath]
              >
            : never;
    };
    context: ContextInit<Context>;
    extractAuth: ExtractAuth<Context, AllowedAuth> | undefined;
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
        infer AllowedAuth,
        infer EndpointDefinitions
    >
        ? ServiceImplementation<unknown, ServiceName, AllowedAuth, EndpointDefinitions>
        : 'ERROR: Failed to infer service definition type parameters';

function assertValidEndpointImplementations<
    const ServiceName extends string,
    const AllowedAuth extends ReadonlyArray<any> | undefined,
    const EndpointsInit extends BaseServiceEndpointsInit<AllowedAuth>,
>(
    service: ServiceDefinition<ServiceName, AllowedAuth, EndpointsInit>,
    endpointImplementations: EndpointImplementations<any, ServiceName, EndpointsInit>,
) {
    const nonFunctionImplementations = getObjectTypedEntries(endpointImplementations).filter(
        ([
            ,
            implementation,
        ]) => {
            return check.isNotFunction(implementation);
        },
    );

    if (nonFunctionImplementations.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `Endpoint implementations are not functions for endpoints: '${nonFunctionImplementations
                .map(([endpointPath]) => endpointPath)
                .join(',')}'`,
            serviceName: service.serviceName,
            routeType: undefined,
        });
    }

    const missingEndpointImplementationPaths: string[] = [];
    const extraEndpointImplementationPaths: string[] = [];

    Object.keys(service.endpoints).forEach((key) => {
        if (!(key in endpointImplementations)) {
            missingEndpointImplementationPaths.push(key);
        }
    });

    Object.keys(endpointImplementations).forEach((key) => {
        if (!(key in service.endpoints)) {
            extraEndpointImplementationPaths.push(key);
        }
    });

    if (missingEndpointImplementationPaths.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `Endpoints are missing implementations: '${missingEndpointImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            routeType: undefined,
        });
    }

    if (extraEndpointImplementationPaths.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `Endpoint implementations have extra endpoints: '${extraEndpointImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            routeType: undefined,
        });
    }
}
