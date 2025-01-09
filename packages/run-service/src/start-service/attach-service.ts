import {
    type EndpointRequest,
    type EndpointResponse,
    type ServiceImplementation,
} from '@rest-vir/implement-service';
import {handleEndpointRequest} from '../handle-endpoint/handle-endpoint.js';

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
        /** The middleware's request handler. */
        handler: (
            request: EndpointRequest,
            response: EndpointResponse,
            next: () => void,
        ) => unknown,
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
    server.use(async (request, response, next) => {
        const endpointMatch = service.getEndpointPath(request.path);
        const endpoint = endpointMatch ? service.endpoints[endpointMatch] : undefined;

        if (endpoint) {
            await handleEndpointRequest(request, response, endpoint, service);
        } else {
            next();
        }
    });
}
