import {check} from '@augment-vir/assert';
import {
    getObjectTypedEntries,
    type ArrayElement,
    type Logger,
    type MaybePromise,
} from '@augment-vir/common';
import {
    ServiceDefinitionError,
    type BaseServiceEndpointsInit,
    type NoParam,
    type ServiceDefinition,
} from '@rest-vir/define-service';
import type {IsEqual} from 'type-fest';
import type {EndpointImplementationParams, EndpointImplementations} from './implement-endpoint.js';

export type ContextInit<Context> =
    | Context
    | ((
          params: Readonly<Omit<EndpointImplementationParams, 'context' | 'auth'>>,
      ) => MaybePromise<Context>);

export type ExtractAuth<Context, AllowedAuth extends ReadonlyArray<any> | undefined> =
    Exclude<AllowedAuth, undefined> extends never
        ? undefined
        : (
              params: Readonly<Omit<EndpointImplementationParams<Context>, 'auth'>>,
          ) => MaybePromise<
              (AllowedAuth extends any[] ? ArrayElement<AllowedAuth> : undefined) | undefined
          >;

export type ServiceErrorHandler = (error: Error) => MaybePromise<void>;

export type ServiceImplementationInit<
    Context,
    AllowedAuth extends ReadonlyArray<any> | undefined,
> = {
    errorHandler?: ServiceErrorHandler;
    log?: Logger;
} & (IsEqual<Context, undefined> extends true
    ? {context?: undefined}
    : {context: ContextInit<Context>}) &
    (IsEqual<AllowedAuth, undefined> extends true
        ? {extractAuth?: undefined}
        : {extractAuth: ExtractAuth<Context, AllowedAuth>});

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
        errorHandler: init.errorHandler,
        log: init.log,
    };
}

export type ServiceImplementation<
    Context = any,
    ServiceName extends string = string,
    AllowedAuth extends ReadonlyArray<any> | undefined = any,
    EndpointsInit extends BaseServiceEndpointsInit<AllowedAuth> | NoParam = NoParam,
> = ServiceDefinition<ServiceName, AllowedAuth, EndpointsInit> & {
    implementations: EndpointImplementations<Context, ServiceName, EndpointsInit>;
    context: ContextInit<Context>;
    extractAuth: ExtractAuth<Context, AllowedAuth> | undefined;
    errorHandler: ServiceErrorHandler | undefined;
    log: Logger | undefined;
};

/**
 * A type util that converts a `ServiceDefinition` instance into its companion
 * `ServiceImplementation`.
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
