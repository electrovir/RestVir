import {EndpointPathBase, ServiceDefinition, type Endpoint} from '@rest-vir/define-service';
import type {ServiceLogger} from '../util/service-logger.js';
import type {EndpointImplementation} from './implement-endpoint.js';
import type {ContextInit, ExtractAuth} from './implement-service.js';

/**
 * A super generic service implementation that be assigned to from any concrete service
 * implementation.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type GenericServiceImplementation = Omit<ServiceDefinition, 'endpoints'> & {
    endpoints: Record<
        EndpointPathBase,
        Endpoint & {implementation: EndpointImplementation<any, any, any>}
    >;
    context: ContextInit<any>;
    extractAuth: ExtractAuth<any, any> | undefined;
    logger: ServiceLogger;
};
