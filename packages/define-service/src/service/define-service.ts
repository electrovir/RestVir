import {assert, check} from '@augment-vir/assert';
import {
    AnyObject,
    extractErrorMessage,
    getObjectTypedEntries,
    mapObjectValues,
    stringify,
} from '@augment-vir/common';
import {assertValidShape, defineShape} from 'object-shape-tester';
import {type IsEqual} from 'type-fest';
import {type EndpointPathBase} from '../endpoint/endpoint-path.js';
import {
    type Endpoint,
    type EndpointInit,
    type WithFinalEndpointProps,
    assertValidEndpoint,
    attachEndpointShapeTypeGetters,
    endpointInitShape,
} from '../endpoint/endpoint.js';
import {type NoParam} from '../util/no-param.js';
import {type OriginRequirement} from '../util/origin.js';
import {MinimalService} from './minimal-service.js';
import {ServiceDefinitionError} from './service-definition.error.js';

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
export type BaseServiceEndpointsInit<AllowedAuth extends ReadonlyArray<any> | undefined = any> =
    Record<EndpointPathBase, EndpointInit<AllowedAuth>>;

/**
 * Init for a service. This is used as an input to {@link defineService}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ServiceInit<
    ServiceName extends string,
    AllowedAuth extends ReadonlyArray<any> | undefined,
    EndpointsInit extends BaseServiceEndpointsInit<NoInfer<AllowedAuth>> | NoParam,
> = MinimalService<ServiceName> & {
    allowedAuth?: AllowedAuth;
    requiredOrigin: NonNullable<OriginRequirement>;
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
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ServiceDefinition<
    ServiceName extends string = any,
    AllowedAuth extends ReadonlyArray<any> | undefined = any,
    EndpointsInit extends BaseServiceEndpointsInit<NoInfer<AllowedAuth>> | NoParam = NoParam,
> = MinimalService<ServiceName> & {
    allowedAuth: AllowedAuth;
    requiredOrigin: NonNullable<OriginRequirement>;
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
 * @category Define Service
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function defineService<
    const ServiceName extends string,
    const EndpointsInit extends BaseServiceEndpointsInit<AllowedAuth>,
    const AllowedAuth extends ReadonlyArray<any> | undefined = undefined,
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
    try {
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
                    requiredOrigin: serviceInit.requiredOrigin,
                } satisfies MinimalService<ServiceName>,
            };

            attachEndpointShapeTypeGetters(endpoint);

            return endpoint;
        });

        return {
            allowedAuth: serviceInit.allowedAuth as AllowedAuth,
            serviceName: serviceInit.serviceName,
            serviceOrigin: serviceInit.serviceOrigin,
            init: serviceInit,
            requiredOrigin: serviceInit.requiredOrigin,
            /** As cast needed again to narrow the type (for the return value) after broadening it. */
            endpoints: endpoints as AnyObject as ServiceDefinition<
                ServiceName,
                AllowedAuth,
                EndpointsInit
            >['endpoints'],
        };
    } catch (error) {
        /* node:coverage ignore next 3: just covering an edge case */
        if (error instanceof ServiceDefinitionError) {
            throw error;
        } else {
            throw new ServiceDefinitionError({
                endpointPath: undefined,
                errorMessage: extractErrorMessage(error),
                serviceName: serviceInit.serviceName,
            });
        }
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

        if (serviceDefinition.allowedAuth) {
            assert.isLengthAtLeast(serviceDefinition.allowedAuth, 1);
        }
        assert.isDefined(serviceDefinition.requiredOrigin);

        getObjectTypedEntries(serviceDefinition.endpoints).forEach(
            ([
                ,
                endpoint,
            ]) => {
                assertValidEndpoint(endpoint, {
                    allowedAuth: serviceDefinition.allowedAuth,
                    serviceName: serviceDefinition.serviceName,
                });
            },
        );
    } catch (error) {
        if (error instanceof ServiceDefinitionError) {
            throw error;
        } else {
            throw new ServiceDefinitionError({
                endpointPath: undefined,
                serviceName: serviceDefinition.serviceName,
                errorMessage: extractErrorMessage(error),
            });
        }
    }
}
