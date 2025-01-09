import {checkWrap} from '@augment-vir/assert';
import {HttpStatus, SelectFrom} from '@augment-vir/common';
import {Endpoint, HttpMethod} from '@rest-vir/define-service';
import {MinimalRequest} from '@rest-vir/implement-service';
import {HandledOutput} from '../endpoint-handler.js';
import {EndpointError} from '../endpoint.error.js';
import {MinimalResponse} from '../response.js';

/**
 * Verifies that a request's method matches the given endpoint's expectations. If it does not, an
 * error response is sent.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function handleRequestMethod(
    this: void,
    request: Readonly<Pick<MinimalRequest, 'method'>>,
    response: Readonly<Pick<MinimalResponse, 'sendStatus'>>,
    endpoint: Readonly<
        SelectFrom<
            Endpoint,
            {
                methods: true;
                endpointPath: true;
                service: {serviceName: true};
            }
        >
    >,
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
