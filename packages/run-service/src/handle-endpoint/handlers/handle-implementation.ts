import {assertWrap, check} from '@augment-vir/assert';
import {ensureErrorAndPrependMessage, HttpStatus, isErrorHttpStatus} from '@augment-vir/common';
import {HttpMethod, type Endpoint} from '@rest-vir/define-service';
import {
    createEndpointErrorPrefix,
    InternalEndpointError,
    type EndpointImplementation,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    type EndpointRequest,
    type EndpointResponse,
    type ServiceImplementation,
} from '@rest-vir/implement-service';
import {setResponseHeaders} from '../../util/headers.js';
import {type HandledOutput} from '../endpoint-handler.js';
import {extractAuth} from './request-auth.js';
import {createContext} from './request-context.js';
import {extractRequestData} from './request-data.js';

/**
 * Handles an endpoint's implementation execution.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function handleImplementation(
    this: void,
    request: Readonly<EndpointRequest>,
    response: Readonly<EndpointResponse>,
    endpoint: Readonly<Endpoint>,
    service: Readonly<ServiceImplementation>,
): Promise<HandledOutput> {
    try {
        const requestData = extractRequestData(request, endpoint);

        if (check.instanceOf(requestData, Error)) {
            response.sendStatus(HttpStatus.BadRequest);
            throw requestData;
        }

        const contextParams: Omit<EndpointImplementationParams, 'context' | 'auth'> = {
            endpoint,
            log: service.logger,
            method: assertWrap.isEnumValue(request.method, HttpMethod),
            request,
            requestData,
            service: service,
        };

        const context = await createContext(contextParams, service);

        const authParams: Omit<EndpointImplementationParams, 'auth'> = {
            ...contextParams,
            context,
        };

        const auth = await extractAuth(authParams, service);

        const endpointParams: EndpointImplementationParams = {
            ...authParams,
            auth,
        };

        const endpointImplementation = service.implementations[endpoint.endpointPath] as
            | EndpointImplementation
            | undefined;

        if (!endpointImplementation) {
            throw new InternalEndpointError(endpoint, 'Missing endpoint implementation.');
        }

        const endpointResult = (await endpointImplementation(
            endpointParams,
        )) as EndpointImplementationOutput;

        if (isErrorHttpStatus(endpointResult.statusCode)) {
            if (endpointResult.responseErrorMessage) {
                response
                    .status(endpointResult.statusCode)
                    .send(endpointResult.responseErrorMessage);
            } else {
                response.sendStatus(endpointResult.statusCode);
            }
        } else if (endpointResult.responseData) {
            if (!endpoint.responseDataShape) {
                throw new InternalEndpointError(
                    endpoint,
                    'Got response data but none was expected.',
                );
            }

            setResponseHeaders(response, {
                'Content-Type': 'application/json',
            });
            response.send(JSON.stringify(endpointResult.responseData));
        } else {
            response.sendStatus(endpointResult.statusCode);
        }

        return {
            handled: true,
        };
    } catch (error) {
        throw ensureErrorAndPrependMessage(error, createEndpointErrorPrefix(endpoint));
    }
}
