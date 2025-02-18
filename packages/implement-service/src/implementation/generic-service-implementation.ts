import {type Overwrite} from '@augment-vir/common';
import {
    EndpointDefinition,
    EndpointPathBase,
    ServiceDefinition,
    WebSocketDefinition,
    type GenericEndpointDefinition,
    type GenericWebSocketDefinition,
    type NoParam,
} from '@rest-vir/define-service';
import {type ServiceLogger} from '../util/service-logger.js';
import {type EndpointImplementation} from './implement-endpoint.js';
import {type WebSocketImplementation} from './implement-web-socket.js';
import {type ContextInit} from './service-context-init.js';

/**
 * A fully implemented endpoint.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ImplementedEndpoint<
    Context = any,
    ServiceName extends string = any,
    SpecificEndpoint extends EndpointDefinition = GenericEndpointDefinition,
> = Overwrite<
    SpecificEndpoint,
    {
        service: GenericServiceImplementation;
    }
> & {
    implementation: EndpointImplementation<Context, ServiceName>;
};

/**
 * A super generic service implementation that be assigned to from any concrete service
 * implementation.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type GenericServiceImplementation = Omit<ServiceDefinition, 'endpoints' | 'webSockets'> & {
    endpoints: Record<EndpointPathBase, any>;
    webSockets: Record<EndpointPathBase, ImplementedWebSocket>;
    createContext: ContextInit<any, any, any, any> | undefined;
    logger: ServiceLogger;
};

/**
 * A fully implemented WebSocket.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ImplementedWebSocket<
    Context = any,
    ServiceName extends string = any,
    SpecificWebSocket extends WebSocketDefinition | NoParam = NoParam,
> = Overwrite<
    SpecificWebSocket extends NoParam ? GenericWebSocketDefinition : SpecificWebSocket,
    {
        service: GenericServiceImplementation;
    }
> & {
    implementation: WebSocketImplementation<Context, ServiceName, SpecificWebSocket>;
};
