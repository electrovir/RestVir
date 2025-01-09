import {ensureError} from '@augment-vir/common';
import {type Endpoint} from '@rest-vir/define-service';
import {
    EndpointRequest,
    EndpointResponse,
    InternalEndpointError,
    ServiceImplementation,
} from '@rest-vir/implement-service';
import type {EndpointHandler} from './endpoint-handler.js';
import {handleCors} from './handlers/handle-cors.js';
import {handleImplementation} from './handlers/handle-implementation.js';
import {handleRequestMethod} from './handlers/handle-request-method.js';

const endpointHandlers: EndpointHandler[] = [
    handleRequestMethod,
    handleCors,
    handleImplementation,
];

/**
 * Once this is called, the endpoint to be executed has already been extracted and we know it
 * matches the current request.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function handleEndpointRequest(
    request: Readonly<EndpointRequest>,
    response: Readonly<EndpointResponse>,
    endpoint: Readonly<Endpoint>,
    service: Readonly<ServiceImplementation>,
) {
    const logParts = [
        request.method,
        request.originalUrl,
    ];
    service.logger.info(logParts.join('\t'));

    try {
        for (const handler of endpointHandlers) {
            const result = await handler(request, response, endpoint, service);
            if (result.handled) {
                /**
                 * If the request has been fully handled then we need not execute any following
                 * handlers.
                 */
                return;
            }
        }

        throw new InternalEndpointError(endpoint, 'Request was not handled.');
    } catch (caught) {
        service.logger.error(ensureError(caught));
    }
}
