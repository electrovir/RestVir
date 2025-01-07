import {assertWrap, check} from '@augment-vir/assert';
import {HttpStatus, isErrorHttpStatus, log} from '@augment-vir/common';
import {HttpMethod, type Endpoint} from '@rest-vir/define-service';
import {
    ServiceImplementation,
    type EndpointImplementation,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {type Request, type Response} from 'express';
import {setResponseHeaders} from '../../util/headers.js';
import {type HandledOutput} from '../endpoint-handler.js';
import {EndpointError} from '../endpoint.error.js';
import {extractAuth} from './request-auth.js';
import {createContext} from './request-context.js';
import {extractRequestData} from './request-data.js';

export async function handleImplementation(
    this: void,
    request: Readonly<Request>,
    response: Readonly<Response>,
    endpoint: Readonly<Endpoint>,
    serviceImplementation: Readonly<ServiceImplementation>,
): Promise<HandledOutput> {
    const requestData = extractRequestData(request, endpoint);

    if (check.instanceOf(requestData, Error)) {
        response.sendStatus(HttpStatus.BadRequest);
        throw requestData;
    }

    const contextParams: Omit<EndpointImplementationParams, 'context' | 'auth'> = {
        endpoint,
        log: serviceImplementation.log || log,
        method: assertWrap.isEnumValue(request.method, HttpMethod),
        request,
        requestData,
        service: serviceImplementation,
    };

    const context = await createContext(contextParams, serviceImplementation);

    const authParams: Omit<EndpointImplementationParams, 'auth'> = {
        ...contextParams,
        context,
    };

    const auth = await extractAuth(authParams, serviceImplementation);

    const endpointParams: EndpointImplementationParams = {
        ...authParams,
        auth,
    };

    const endpointImplementation = serviceImplementation.implementations[endpoint.endpointPath] as
        | EndpointImplementation
        | undefined;

    if (!endpointImplementation) {
        throw new EndpointError(endpoint, 'Missing endpoint implementation.');
    }

    const endpointResult = (await endpointImplementation(
        endpointParams,
    )) as EndpointImplementationOutput;

    if (isErrorHttpStatus(endpointResult.statusCode)) {
        if (endpointResult.responseErrorMessage) {
            response.status(endpointResult.statusCode).send(endpointResult.responseErrorMessage);
        } else {
            response.sendStatus(endpointResult.statusCode);
        }
    } else if (endpointResult.responseData) {
        if (!endpoint.responseDataShape) {
            throw new EndpointError(endpoint, 'Got response data but none was expected.');
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
}
