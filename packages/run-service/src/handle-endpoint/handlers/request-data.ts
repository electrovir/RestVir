import {check} from '@augment-vir/assert';
import {wrapInTry} from '@augment-vir/common';
import {type Endpoint} from '@rest-vir/define-service';
import {type Request} from 'express';
import {assertValidShape} from 'object-shape-tester';
import {EndpointError} from '../endpoint.error.js';

export function extractRequestData(
    request: Readonly<Request>,
    endpoint: Readonly<Endpoint>,
): unknown {
    const requestData = parseRequestData(request);
    const requestDataShape = endpoint.requestDataShape;

    if (!requestDataShape) {
        if (requestData) {
            return new EndpointError(endpoint, `Did not expect any request data but received it.`);
        } else {
            return undefined;
        }
    }

    const assertResult = wrapInTry(() => assertValidShape(requestData, requestDataShape));

    if (check.instanceOf(assertResult, Error)) {
        return assertResult;
    }

    return requestData;
}

function parseRequestData(request: Readonly<Request>) {
    try {
        if (!request.body) {
            return undefined;
        } else if (check.isString(request.body)) {
            return JSON.parse(request.body);
        } else {
            return request.body;
        }
    } catch {
        return request.body;
    }
}
