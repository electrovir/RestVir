import {check} from '@augment-vir/assert';
import {ensureError, HttpStatus} from '@augment-vir/common';
import {
    EndpointRequest,
    EndpointResponse,
    InternalEndpointError,
    type ImplementedEndpoint,
} from '@rest-vir/implement-service';
import cluster from 'node:cluster';
import {setResponseHeaders} from '../util/headers.js';
import type {EndpointHandler} from './endpoint-handler.js';
import {handleCors} from './handlers/handle-cors.js';
import {handleImplementation} from './handlers/handle-implementation/handle-implementation.js';
import {handleRequestMethod} from './handlers/handle-request-method.js';

const endpointHandlers: EndpointHandler[] = [
    handleRequestMethod,
    handleCors,
    handleImplementation,
];

/**
 * Options for {@link handleEndpointRequest}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type HandleEndpointRequestOptions = Partial<{
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
 * Once this is called, the endpoint to be executed has already been extracted and we know it
 * matches the current request.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function handleEndpointRequest(
    request: EndpointRequest,
    response: EndpointResponse,
    endpoint: Readonly<ImplementedEndpoint>,
    {throwErrorsForExternalHandling}: HandleEndpointRequestOptions = {},
) {
    try {
        const workerPid = cluster.isPrimary ? '' : process.pid;

        const logParts = [
            workerPid,
            request.method,
            request.originalUrl,
        ].filter(check.isTruthy);
        endpoint.service.logger.info(logParts.join('\t'));

        for (const handler of endpointHandlers) {
            const handlerResult = await handler({request, response, endpoint});
            if (handlerResult) {
                if (handlerResult.headers) {
                    setResponseHeaders(response, handlerResult.headers);
                }

                if (handlerResult.statusCode) {
                    response.statusCode = handlerResult.statusCode;

                    if (handlerResult.body) {
                        response.send(handlerResult.body);
                    } else {
                        response.send();
                    }
                    return;
                }
            }
        }

        /* node:coverage ignore next: currently this is not possible to trigger, but it is here as a fail-safe for the potential future edge case. */
        throw new InternalEndpointError(endpoint, 'Request was not handled.');
    } catch (error) {
        endpoint.service.logger.error(ensureError(error));
        if (throwErrorsForExternalHandling) {
            throw error;
        } else if (!response.sent) {
            response.statusCode = HttpStatus.InternalServerError;
            response.send();
        }
    }
}
