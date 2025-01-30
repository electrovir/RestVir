import {type Overwrite} from '@augment-vir/common';
import {
    type Endpoint,
    type EndpointPathBase,
    type ServiceDefinition,
    type Socket,
} from '@rest-vir/define-service';
import {type ServiceLogger} from '../util/service-logger.js';
import {
    type ContextInit,
    type EndpointImplementation,
    type ExtractAuth,
} from './implement-endpoint.js';
import {type SocketImplementation} from './implement-socket.js';

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
    context: ContextInit<any>;
    extractAuth: ExtractAuth<any, any> | undefined;
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
