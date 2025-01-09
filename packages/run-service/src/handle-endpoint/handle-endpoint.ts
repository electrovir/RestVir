import {ensureError, log} from '@augment-vir/common';
import {type Endpoint} from '@rest-vir/define-service';
import type {ServiceImplementation} from '@rest-vir/implement-service';
import {MinimalRequest} from '@rest-vir/implement-service/src/request.js';
import {EndpointHandler} from './endpoint-handler.js';
import {EndpointError} from './endpoint.error.js';
import {handleCors} from './handlers/handle-cors.js';
import {handleRequestMethod} from './handlers/handle-request-method.js';
import {MinimalResponse} from './response.js';

const endpointHandlers: EndpointHandler[] = [
    handleRequestMethod,
    handleCors,
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
    request: Readonly<MinimalRequest>,
    response: Readonly<MinimalResponse>,
    endpoint: Readonly<Endpoint>,
    serviceImplementation: Readonly<ServiceImplementation>,
) {
    const errorHandler =
        serviceImplementation.errorHandler || serviceImplementation.log?.error || log.error;

    try {
        for (const handler of endpointHandlers) {
            const result = await handler(request, response, endpoint, serviceImplementation);
            if (result.handled) {
                /**
                 * If the request has been fully handled then we need not execute any following
                 * handlers.
                 */
                return;
            }
        }

        throw new EndpointError(endpoint, 'Request was not handled.');
    } catch (caught) {
        await errorHandler(ensureError(caught));
    }
}
