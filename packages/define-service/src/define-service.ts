import {assert, check} from '@augment-vir/assert';
import {
    getObjectTypedEntries,
    mapObjectValues,
    stringify,
    type AnyObject,
} from '@augment-vir/common';
import {assertValidShape, defineShape} from 'object-shape-tester';
import type {IsEqual} from 'type-fest';
import {EndpointPathBase} from './endpoint-path.js';
import {
    Endpoint,
    EndpointInit,
    WithFinalEndpointProps,
    assertValidEndpoint,
    attachEndpointShapeTypeGetters,
    endpointInitShape,
} from './endpoint.js';
import {MinimalService} from './minimal-service.js';
import type {NoParam} from './no-param.js';
import {ServiceDefinitionError} from './service-definition.error.js';

/**
 * A string used for type errors triggered when an endpoint path is defined without a leading slash.
 *
 * @category Internal
 */
export type EndpointMustStartWithSlashTypeError = 'ERROR: endpoint must start with a slash';

/**
 * Base type used for the right side of "extends" in type parameters for generic endpoint
 * definitions.
 *
 * @category Internal
 */
export type BaseServiceEndpointsInit<AllowedAuth extends ReadonlyArray<any> | undefined> = Record<
    EndpointPathBase,
    EndpointInit<AllowedAuth>
>;

/**
 * Init for a service. This is used as an input to {@link defineService}.
 *
 * @category Service
 */
export type ServiceInit<
    ServiceName extends string,
    AllowedAuth extends ReadonlyArray<any> | undefined,
    EndpointsInit extends BaseServiceEndpointsInit<NoInfer<AllowedAuth>> | NoParam,
> = MinimalService<ServiceName> & {
    allowedAuth: AllowedAuth;
    endpoints: IsEqual<EndpointsInit, NoParam> extends true
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
 * @category Service
 */
export type ServiceDefinition<
    ServiceName extends string = string,
    AllowedAuth extends ReadonlyArray<any> | undefined = any,
    EndpointsInit extends BaseServiceEndpointsInit<NoInfer<AllowedAuth>> | NoParam = NoParam,
> = MinimalService<ServiceName> & {
    allowedAuth: AllowedAuth;
    /** Include the initial init object so a service can be composed. */
    init: ServiceInit<ServiceName, AllowedAuth, EndpointsInit>;
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
 * @category Service
 */
export function defineService<
    const ServiceName extends string,
    const AllowedAuth extends ReadonlyArray<any> | undefined,
    const EndpointsInit extends BaseServiceEndpointsInit<AllowedAuth>,
>(
    serviceInit: ServiceInit<ServiceName, AllowedAuth, EndpointsInit>,
): ServiceDefinition<ServiceName, AllowedAuth, EndpointsInit> {
    const serviceDefinition = finalizeServiceDefinition(serviceInit);
    assertValidServiceDefinition(serviceDefinition);
    return serviceDefinition;
}

function finalizeServiceDefinition<
    const ServiceName extends string,
    const AllowedAuth extends ReadonlyArray<any> | undefined,
    const EndpointsInit extends BaseServiceEndpointsInit<AllowedAuth>,
>(
    serviceInit: ServiceInit<ServiceName, AllowedAuth, EndpointsInit>,
): ServiceDefinition<ServiceName, AllowedAuth, EndpointsInit> {
    /**
     * Make the types less strict because we don't care what they are inside of this function's
     * implementation. Just the return type is what matters.
     */
    const genericEndpoints = serviceInit.endpoints as BaseServiceEndpointsInit<AllowedAuth>;

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
            service: {
                serviceName: serviceInit.serviceName,
                serviceOrigin: serviceInit.serviceOrigin,
            } satisfies MinimalService<ServiceName>,
        };

        attachEndpointShapeTypeGetters(endpoint);

        return endpoint;
    });

    return {
        allowedAuth: serviceInit.allowedAuth,
        serviceName: serviceInit.serviceName,
        serviceOrigin: serviceInit.serviceOrigin,
        init: serviceInit,
        /** As cast needed again to narrow the type (for the return value) after broadening it. */
        endpoints: endpoints as AnyObject as ServiceDefinition<
            ServiceName,
            AllowedAuth,
            EndpointsInit
        >['endpoints'],
    };
}

/**
 * Asserts that the given input is a valid {@link ServiceDefinition} instance.
 *
 * @category Internal
 * @throws {@link ServiceDefinitionError} : if there is an issue
 */
export function assertValidServiceDefinition(
    serviceDefinition: ServiceDefinition,
): asserts serviceDefinition is ServiceDefinition {
    if (!serviceDefinition.serviceName || !check.isString(serviceDefinition.serviceName)) {
        throw new ServiceDefinitionError({
            endpointPath: undefined,
            serviceName: serviceDefinition.serviceName,
            errorMessage: `Invalid service name: '${stringify(serviceDefinition.serviceName)}'. Expected a non-empty string.`,
        });
    }

    if (serviceDefinition.allowedAuth) {
        assert.isLengthAtLeast(serviceDefinition.allowedAuth, 1);
    }

    getObjectTypedEntries(serviceDefinition.endpoints).forEach(
        ([
            endpointPath,
            endpoint,
        ]) => {
            if (check.isString(endpoint)) {
                throw new ServiceDefinitionError({
                    endpointPath,
                    serviceName: serviceDefinition.serviceName,
                    errorMessage: 'Invalid endpoint config, it cannot be a string.',
                });
            }

            assertValidEndpoint(endpoint, {
                allowedAuth: serviceDefinition.allowedAuth,
                serviceName: serviceDefinition.serviceName,
            });
        },
    );
}
