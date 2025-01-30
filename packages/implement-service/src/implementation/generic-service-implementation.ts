import {type Overwrite} from '@augment-vir/common';
import {Endpoint, EndpointPathBase, ServiceDefinition, Socket} from '@rest-vir/define-service';
import {type ServiceLogger} from '../util/service-logger.js';
import {type EndpointImplementation} from './implement-endpoint.js';
import {type SocketImplementation} from './implement-socket.js';
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
    SpecificEndpoint extends Endpoint = Endpoint,
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
export type GenericServiceImplementation = Omit<ServiceDefinition, 'endpoints'> & {
    endpoints: Record<EndpointPathBase, ImplementedEndpoint>;
    sockets: Record<EndpointPathBase, ImplementedSocket>;
    createContext: ContextInit<any, any, any, any> | undefined;
    logger: ServiceLogger;
};

/**
 * A fully implemented socket.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ImplementedSocket<
    Context = any,
    ServiceName extends string = any,
    SpecificSocket extends Socket = Socket,
> = Overwrite<
    SpecificSocket,
    {
        service: GenericServiceImplementation;
    }
> & {
    implementation: SocketImplementation<Context, ServiceName, SpecificSocket>;
};
