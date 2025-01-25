import {
    type EndpointRequest,
    type EndpointResponse,
    type ServiceImplementation,
} from '@rest-vir/implement-service';
import {handleEndpointRequest} from '../handle-endpoint/handle-endpoint.js';

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
 * Options for {@link attachService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type AttachServiceOptions = Partial<{
    /**
     * If set to `true`, all service endpoint handlers will throw any errors, allowing your existing
     * server setup to catch them and handle them as you wish.
     *
     * If set to `false`, all service endpoint handlers will handle the errors internally to prevent
     * accidentally leaking error messages to the frontend.
     *
     * @default `false`
     */
    throwErrorsForExternalHandling: boolean;
}>;

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
    service: Readonly<ServiceImplementation>,
    options: AttachServiceOptions = {},
): void {
    Object.entries(service.endpoints).forEach(
        ([
            path,
            endpoint,
        ]) => {
            server.all(path, async (request, response) => {
                await handleEndpointRequest(
                    request,
                    response,
                    endpoint,
                    !!options.throwErrorsForExternalHandling,
                );
            });
        },
    );
}
