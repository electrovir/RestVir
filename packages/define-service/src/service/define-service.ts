import {assert, check} from '@augment-vir/assert';
import {AnyObject, getObjectTypedEntries, mapObjectValues, stringify} from '@augment-vir/common';
import {assertValidShape, defineShape} from 'object-shape-tester';
import {
    assertValidEndpoint,
    attachEndpointShapeTypeGetters,
    endpointInitShape,
    type EndpointDefinition,
} from '../endpoint/endpoint.js';
import {
    WebSocketDefinition,
    assertValidWebSocketDefinition,
    attachWebSocketShapeTypeGetters,
    webSocketInitShape,
} from '../web-socket/web-socket-definition.js';
import {MinimalService} from './minimal-service.js';
import {ensureServiceDefinitionError} from './service-definition.error.js';
import type {
    BaseServiceEndpointsInit,
    BaseServiceWebSocketsInit,
    ServiceDefinition,
    ServiceInit,
} from './service-definition.js';

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

        const serviceDefinition: ServiceDefinition<ServiceName, EndpointsInit, WebSocketsInit> = {
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

        return serviceDefinition;
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
