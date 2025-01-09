import type {MinimalRequest, ServiceImplementation} from '@rest-vir/implement-service';
import {handleEndpointRequest} from '../handle-endpoint/handle-endpoint.js';
import type {MinimalResponse} from '../handle-endpoint/response.js';

/**
 * The bare minimum server object type needed for rest-vir to function.
 *
 * This type is used to maximize flexibility between different server providers (like express or
 * hyper-express).
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type MinimalServer = {
    /** Attaches a middleware for the given path to the server. */
    use(
        path: string,
        /** The middleware's request handler. */
        handler: (request: MinimalRequest, response: MinimalResponse) => unknown,
    ): unknown;
};

/**
 * Attach all handlers for a {@link ServiceImplementation} to any existing backend server.
 *
 * @category Run Service
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function attachService(
    server: Readonly<MinimalServer>,
    service: Readonly<ServiceImplementation>,
): void {
    Object.values(service.endpoints).forEach((endpoint) => {
        server.use(endpoint.endpointPath, async (request, response) => {
            await handleEndpointRequest(request, response, endpoint, service);
        });
    });
}
