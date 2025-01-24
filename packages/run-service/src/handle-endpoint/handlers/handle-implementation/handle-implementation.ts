import {assertWrap, check} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    HttpMethod,
    HttpStatus,
    isErrorHttpStatus,
    wrapInTry,
} from '@augment-vir/common';
import {
    createEndpointErrorPrefix,
    InternalEndpointError,
    type EndpointImplementation,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {assertValidShape} from 'object-shape-tester';
import {EndpointHandlerParams, type HandledOutput} from '../../endpoint-handler.js';
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
    {endpoint, request, response, service}: Readonly<EndpointHandlerParams>,
): Promise<HandledOutput> {
    try {
        const requestData = wrapInTry(() => extractRequestData(request.body, endpoint));

        if (check.instanceOf(requestData, Error)) {
            return {
                statusCode: HttpStatus.BadRequest,
                error: requestData,
            };
        }

        const contextParams: Omit<EndpointImplementationParams, 'context' | 'auth'> = {
            endpoint,
            log: service.logger,
            method: assertWrap.isEnumValue(request.method, HttpMethod),
            response,
            request,
            requestData,
            service,
            requestHeaders: request.headers,
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
            return {
                statusCode: endpointResult.statusCode,
                body: endpointResult.responseErrorMessage,
            };
        } else if (endpointResult.responseData) {
            if (!endpoint.responseDataShape) {
                throw new InternalEndpointError(
                    endpoint,
                    'Got response data but none was expected.',
                );
            }

            assertValidShape(endpointResult.responseData, endpoint.responseDataShape);

            return {
                headers: {
                    'content-type': endpointResult.dataType || 'application/json',
                },
                statusCode: HttpStatus.Ok,
                body: endpointResult.responseData,
            };
        } else {
            return {
                statusCode: HttpStatus.Ok,
            };
        }
    } catch (error) {
        throw ensureErrorAndPrependMessage(error, createEndpointErrorPrefix(endpoint));
    }
}
