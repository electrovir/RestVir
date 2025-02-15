import {assertWrap} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    HttpStatus,
    isErrorHttpStatus,
    log,
} from '@augment-vir/common';
import {
    createRestVirHandlerErrorPrefix,
    EndpointImplementationOutput,
    EndpointImplementationParams,
    HttpMethod,
    ImplementedEndpoint,
    RestVirHandlerError,
} from '@rest-vir/implement-service';
import {assertValidShape} from 'object-shape-tester';
import {EndpointHandlerParams, HandleRouteOptions, type HandledOutput} from './endpoint-handler.js';

/**
 * Handles an endpoint's implementation execution.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function handleEndpointRequest(
    this: void,
    {
        endpoint,
        request,
        response,
        attachId,
    }: Readonly<
        Omit<EndpointHandlerParams, 'route'> & {
            attachId: string;
            endpoint: Readonly<ImplementedEndpoint>;
        }
    >,
    options: Readonly<HandleRouteOptions> = {},
): Promise<HandledOutput> {
    try {
        const context = request.restVirContext?.[attachId]?.context;
        const requestData = request.restVirContext?.[attachId]?.requestData;

        const endpointParams: EndpointImplementationParams = {
            method: assertWrap.isEnumValue(request.method.toUpperCase(), HttpMethod),
            request,
            requestData,
            requestHeaders: request.headers,
            response,
            service: endpoint.service,
            endpoint,
            log: endpoint.service.logger,
            context,
        };

        const endpointResult = (await endpoint.implementation(
            endpointParams,
        )) as EndpointImplementationOutput;

        if (isErrorHttpStatus(endpointResult.statusCode)) {
            log.if(!!options.debug).error(
                `Endpoint implementation return error status: ${endpointResult.statusCode}`,
            );
            return {
                statusCode: endpointResult.statusCode,
                body: endpointResult.responseErrorMessage,
            };
        } else if (endpointResult.responseData) {
            if (!endpoint.responseDataShape) {
                throw new RestVirHandlerError(endpoint, 'Got response data but none was expected.');
            }

            assertValidShape(
                endpointResult.responseData,
                endpoint.responseDataShape,
                {allowExtraKeys: true},
                'invalid response data',
            );

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
        throw ensureErrorAndPrependMessage(error, createRestVirHandlerErrorPrefix(endpoint));
    }
}
