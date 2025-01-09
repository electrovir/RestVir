import {check} from '@augment-vir/assert';
import {SelectFrom, wrapInTry} from '@augment-vir/common';
import {type Endpoint} from '@rest-vir/define-service';
import {MinimalRequest} from '@rest-vir/implement-service/src/request.js';
import {assertValidShape} from 'object-shape-tester';
import {EndpointError} from '../endpoint.error.js';

/**
 * Attempts to extract expected request data from the given request.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function extractRequestData(
    request: Readonly<Pick<MinimalRequest, 'body'>>,
    endpoint: Readonly<
        SelectFrom<
            Endpoint,
            {
                requestDataShape: true;
                endpointPath: true;
                service: {serviceName: true};
            }
        >
    >,
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

    const assertResult = wrapInTry(() =>
        assertValidShape(requestData, requestDataShape, {
            /** Allow extra keys for forwards / backwards compatibility. */
            allowExtraKeys: true,
        }),
    );

    if (check.instanceOf(assertResult, Error)) {
        return assertResult;
    }

    return requestData;
}

function parseRequestData(request: Readonly<Pick<MinimalRequest, 'body'>>) {
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
