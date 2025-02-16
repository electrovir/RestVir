import {assert, check} from '@augment-vir/assert';
import {AnyObject, getObjectTypedEntries, mapObjectValues, stringify} from '@augment-vir/common';
import {assertValidShape, defineShape} from 'object-shape-tester';
import {type IsEqual, type SetRequired} from 'type-fest';
import {type EndpointPathBase} from '../endpoint/endpoint-path.js';
import {
    assertValidEndpoint,
    attachEndpointShapeTypeGetters,
    endpointInitShape,
    type EndpointDefinition,
    type EndpointInit,
    type WithFinalEndpointProps,
} from '../endpoint/endpoint.js';
import {type NoParam} from '../util/no-param.js';
import {type OriginRequirement} from '../util/origin.js';
import {
    WebSocketDefinition,
    WebSocketInit,
    WithFinalWebSocketProps,
    assertValidWebSocketDefinition,
    attachWebSocketShapeTypeGetters,
    webSocketInitShape,
} from '../web-socket/web-socket-definition.js';
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
export type BaseServiceWebSocketsInit = Record<EndpointPathBase, WebSocketInit>;

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
    WebSocketsInit extends BaseServiceWebSocketsInit | NoParam,
> = MinimalService<ServiceName> & {
    requiredClientOrigin: NonNullable<OriginRequirement>;
    webSockets?: IsEqual<WebSocketsInit, NoParam> extends true
        ? Record<EndpointPathBase, WebSocketInit>
        : {
              [WebSocketPath in keyof WebSocketsInit]: WebSocketPath extends EndpointPathBase
                  ? WebSocketsInit[WebSocketPath]
                  : WebSocketPath extends EndpointMustStartWithSlashTypeError
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
    WebSocketsInit extends BaseServiceWebSocketsInit | NoParam = NoParam,
> = MinimalService<ServiceName> & {
    requiredClientOrigin: NonNullable<OriginRequirement>;
    /** Include the initial init object so a service can be composed. */
    init: SetRequired<
        ServiceInit<ServiceName, EndpointsInit, WebSocketsInit>,
        'endpoints' | 'webSockets'
    >;
    webSockets: WebSocketsInit extends NoParam
        ? {
              [WebSocketPath in EndpointPathBase]: WebSocketDefinition;
          }
        : {
              [WebSocketPath in keyof WebSocketsInit]: WebSocketPath extends EndpointPathBase
                  ? WithFinalWebSocketProps<WebSocketsInit[WebSocketPath], WebSocketPath>
                  : EndpointMustStartWithSlashTypeError;
          };
    endpoints: EndpointsInit extends NoParam
        ? {
              [EndpointPath in EndpointPathBase]: EndpointDefinition;
          }
        : {
              [EndpointPath in keyof EndpointsInit]: EndpointPath extends EndpointPathBase
                  ? WithFinalEndpointProps<EndpointsInit[EndpointPath], EndpointPath>
                  : EndpointMustStartWithSlashTypeError;
          };
    /** Given a URL, find the endpoint path from this service that matches it. */
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
    EndpointsInit extends BaseServiceEndpointsInit,
    WebSocketsInit extends BaseServiceWebSocketsInit,
>(
    serviceInit: ServiceInit<ServiceName, EndpointsInit, WebSocketsInit>,
): ServiceDefinition<ServiceName, EndpointsInit, WebSocketsInit> {
    const serviceDefinition = finalizeServiceDefinition(serviceInit);
    assertValidServiceDefinition(serviceDefinition);
    return serviceDefinition;
}

function finalizeServiceDefinition<
    const ServiceName extends string,
    EndpointsInit extends BaseServiceEndpointsInit,
    WebSocketsInit extends BaseServiceWebSocketsInit,
>(
    serviceInit: ServiceInit<ServiceName, EndpointsInit, WebSocketsInit>,
): ServiceDefinition<ServiceName, EndpointsInit, WebSocketsInit> {
    try {
        const minimalService: MinimalService<ServiceName> = {
            serviceName: serviceInit.serviceName,
            serviceOrigin: serviceInit.serviceOrigin,
            requiredClientOrigin: serviceInit.requiredClientOrigin,
        };

        /**
         * Make the types less strict because we don't care what they are inside of this function's
         * implementation. Just the return type is what matters.
         */
        const genericEndpoints = (serviceInit.endpoints || {}) as BaseServiceEndpointsInit;

        const endpoints = mapObjectValues(genericEndpoints, (endpointPath, endpointInit) => {
            assertValidShape({searchParamsShape: undefined, ...endpointInit}, endpointInitShape);
            const endpoint = {
                ...endpointInit,
                requestDataShape: endpointInit.requestDataShape
                    ? defineShape<any, true>(endpointInit.requestDataShape, true)
                    : undefined,
                responseDataShape: endpointInit.responseDataShape
                    ? defineShape<any, true>(endpointInit.responseDataShape, true)
                    : undefined,

                path: endpointPath,
                service: minimalService,
                customProps: endpointInit.customProps,
                isEndpoint: true,
                isWebSocket: false,
                searchParamsShape: (endpointInit.searchParamsShape
                    ? defineShape<any, any>(endpointInit.searchParamsShape)
                    : undefined) as EndpointDefinition['searchParamsShape'],
            } satisfies Omit<
                EndpointDefinition,
                'ResponseType' | 'RequestType' | 'SearchParamsType'
            >;

            attachEndpointShapeTypeGetters(endpoint);

            return endpoint;
        });

        const genericWebSockets = (serviceInit.webSockets || {}) as BaseServiceWebSocketsInit;

        const webSockets = mapObjectValues(genericWebSockets, (webSocketPath, webSocketInit) => {
            assertValidShape(
                {protocolsShape: undefined, searchParamsShape: undefined, ...webSocketInit},
                webSocketInitShape,
            );
            const webSocketDefinition = {
                ...webSocketInit,
                messageFromClientShape: webSocketInit.messageFromClientShape
                    ? defineShape(webSocketInit.messageFromClientShape)
                    : undefined,
                messageFromHostShape: webSocketInit.messageFromHostShape
                    ? defineShape(webSocketInit.messageFromHostShape)
                    : undefined,
                protocolsShape: (webSocketInit.protocolsShape
                    ? defineShape(webSocketInit.protocolsShape)
                    : undefined) as WebSocketDefinition['protocolsShape'],
                searchParamsShape: (webSocketInit.searchParamsShape
                    ? defineShape(webSocketInit.searchParamsShape)
                    : undefined) as WebSocketDefinition['searchParamsShape'],
                service: minimalService,
                path: webSocketPath,
                customProps: webSocketInit.customProps,
                isEndpoint: false,
                isWebSocket: true,
            } satisfies Omit<
                WebSocketDefinition,
                | 'MessageFromClientType'
                | 'MessageFromHostType'
                | 'ProtocolsType'
                | 'SearchParamsType'
            >;

            attachWebSocketShapeTypeGetters(webSocketDefinition);

            return webSocketDefinition;
        });

        return {
            serviceName: serviceInit.serviceName,
            serviceOrigin: serviceInit.serviceOrigin,
            init: {
                ...serviceInit,
                webSockets: (serviceInit.webSockets || {}) as ServiceDefinition<
                    ServiceName,
                    EndpointsInit,
                    WebSocketsInit
                >['init']['webSockets'],
                endpoints: (serviceInit.endpoints || {}) as ServiceDefinition<
                    ServiceName,
                    EndpointsInit,
                    WebSocketsInit
                >['init']['endpoints'],
            },
            webSockets: webSockets as AnyObject as ServiceDefinition<
                ServiceName,
                EndpointsInit,
                WebSocketsInit
            >['webSockets'],
            requiredClientOrigin: serviceInit.requiredClientOrigin,
            /** As cast needed again to narrow the type (for the return value) after broadening it. */
            endpoints: endpoints as AnyObject as ServiceDefinition<
                ServiceName,
                EndpointsInit,
                WebSocketsInit
            >['endpoints'],
        };
    } catch (error) {
        throw ensureServiceDefinitionError(error, {
            path: undefined,
            serviceName: serviceInit.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
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

        assert.isDefined(serviceDefinition.requiredClientOrigin);

        getObjectTypedEntries(serviceDefinition.endpoints).forEach(
            ([
                ,
                endpoint,
            ]) => {
                assertValidEndpoint(endpoint);
            },
        );

        getObjectTypedEntries(serviceDefinition.webSockets).forEach(
            ([
                ,
                webSocketDefinition,
            ]) => {
                assertValidWebSocketDefinition(webSocketDefinition);
            },
        );
    } catch (error) {
        throw ensureServiceDefinitionError(error, {
            path: undefined,
            serviceName: serviceDefinition.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
        });
    }
}
