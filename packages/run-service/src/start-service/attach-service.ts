import type {SelectFrom} from '@augment-vir/common';
import {
    type EndpointRequest,
    type EndpointResponse,
    type ServiceImplementation,
} from '@rest-vir/implement-service';
import {
    handleEndpointRequest,
    HandleEndpointRequestOptions,
} from '../handle-endpoint/handle-endpoint.js';

/**
 * The bare minimum server object type needed for rest-vir to function.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type MinimalServer = {
    /** Attaches a middleware for the given path to the server. */
    all(
        path: string,
        /** The middleware's request handler. */
        handler: (request: EndpointRequest, response: EndpointResponse) => unknown,
    ): unknown;
};

/**
 * Attach all handlers for a {@link ServiceImplementation} to any existing Fastify server.
 *
 * @category Run Service
 * @category Package : @rest-vir/run-service
 * @example
 *
 * ```ts
 * import fastify from 'fastify';
 *
 * const server = fastify();
 *
 * attachService(service, myServiceImplementation);
 *
 * await server.listen({port: 3000});
 * ```
 *
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function attachService(
    server: Readonly<MinimalServer>,
    service: Readonly<
        SelectFrom<
            ServiceImplementation,
            {
                endpoints: true;
            }
        >
    >,
    options: HandleEndpointRequestOptions = {},
): void {
    Object.entries(service.endpoints).forEach(
        ([
            path,
            endpoint,
        ]) => {
            server.all(path, async (request, response) => {
                await handleEndpointRequest(request, response, endpoint, options);
            });
        },
    );
}
