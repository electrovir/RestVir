import {checkWrap} from '@augment-vir/assert';
import {HttpStatus} from '@augment-vir/common';
import {Endpoint, HttpMethod} from '@rest-vir/define-service';
import {Request, Response} from 'express';
import {HandledOutput} from '../endpoint-handler.js';
import {EndpointError} from '../endpoint.error.js';

export function handleRequestMethod(
    this: void,
    request: Readonly<Request>,
    response: Readonly<Response>,
    endpoint: Readonly<Endpoint>,
): HandledOutput {
    const requestMethod = checkWrap.isEnumValue(request.method.toUpperCase(), HttpMethod);

    /** Always allow preflight requests. */
    if (requestMethod === HttpMethod.Options) {
        return {handled: false};
    } else if (!requestMethod || !endpoint.methods[requestMethod]) {
        response.sendStatus(HttpStatus.MethodNotAllowed);
        throw new EndpointError(endpoint, `Unexpected request method: '${request.method}'`);
    }

    return {handled: false};
}
