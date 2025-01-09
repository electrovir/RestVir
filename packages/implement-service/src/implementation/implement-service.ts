import {check} from '@augment-vir/assert';
import {getObjectTypedEntries, type ArrayElement, type MaybePromise} from '@augment-vir/common';
import {
    ServiceDefinitionError,
    type BaseServiceEndpointsInit,
    type EndpointPathBase,
    type NoParam,
    type ServiceDefinition,
} from '@rest-vir/define-service';
import {match} from 'path-to-regexp';
import type {IsEqual} from 'type-fest';
import {
    createServiceLogger,
    ServiceLoggerOption,
    silentServiceLogger,
    type ServiceLogger,
} from '../util/service-logger.js';
import type {EndpointImplementationParams, EndpointImplementations} from './implement-endpoint.js';

/**
 * User-defined service Context or Context generator.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ContextInit<Context> =
    | Context
    | ((
          params: Readonly<Omit<EndpointImplementationParams, 'context' | 'auth'>>,
      ) => MaybePromise<Context>);

/**
 * User-defined function that extracts the current auth of an individual request.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ExtractAuth<Context, AllowedAuth extends ReadonlyArray<any> | undefined> =
    Exclude<AllowedAuth, undefined> extends never
        ? undefined
        : (
              params: Readonly<Omit<EndpointImplementationParams<Context>, 'auth'>>,
          ) => MaybePromise<
              (AllowedAuth extends any[] ? ArrayElement<AllowedAuth> : undefined) | undefined
          >;

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

    return {
        ...service,
        implementations: endpointImplementations,
        context: init.context as ContextInit<Context>,
        extractAuth: init.extractAuth,
        logger: createServiceLogger(init.logger),
        getEndpointPath: generateEndpointFinder(service),
    };
}

/**
 * Given a raw path, finds the matching endpoint service path. If no match is found, this returns
 * `undefined`.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointFinder = (requestPath: string) => EndpointPathBase | undefined;

function generateEndpointFinder(service: Readonly<ServiceDefinition>): EndpointFinder {
    const endpointMatchers = Object.keys(service.endpoints).map((endpointPath) => {
        return {
            match: match(endpointPath),
            endpointPath: endpointPath as EndpointPathBase,
        };
    });

    return (path: string) => {
        for (const matcher of endpointMatchers) {
            if (matcher.match(path)) {
                return matcher.endpointPath;
            }
        }

        return undefined;
    };
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
> = ServiceDefinition<ServiceName, AllowedAuth, EndpointsInit> & {
    implementations: EndpointImplementations<Context, ServiceName, EndpointsInit>;
    context: ContextInit<Context>;
    extractAuth: ExtractAuth<Context, AllowedAuth> | undefined;
    logger: ServiceLogger;
    getEndpointPath: EndpointFinder;
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
            endpointPath: undefined,
            errorMessage: `Endpoint implementations are not functions for endpoints: '${nonFunctionImplementations
                .map(([endpointPath]) => endpointPath)
                .join(',')}'`,
            serviceName: service.serviceName,
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
            endpointPath: undefined,
            errorMessage: `Endpoints are missing implementations: '${missingEndpointImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
        });
    }

    if (extraEndpointImplementationPaths.length) {
        throw new ServiceDefinitionError({
            endpointPath: undefined,
            errorMessage: `Endpoint implementations have extra endpoints: '${extraEndpointImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
        });
    }
}
