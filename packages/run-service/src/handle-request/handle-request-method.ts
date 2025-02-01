import {checkWrap} from '@augment-vir/assert';
import {HttpMethod, HttpStatus, SelectFrom} from '@augment-vir/common';
import {HandledOutput, type EndpointHandlerParams} from './endpoint-handler.js';

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
    {
        route,
        request,
    }: Readonly<
        SelectFrom<
            EndpointHandlerParams,
            {
                request: {
                    method: true;
                };
                route: {
                    methods: true;
                    path: true;
                    service: {serviceName: true};
                };
            }
        >
    >,
): HandledOutput {
    const requestMethod = checkWrap.isEnumValue(request.method.toUpperCase(), HttpMethod);

    /** Always allow preflight requests. */
    if (requestMethod === HttpMethod.Options) {
        return undefined;
    }

    const allowedMethods =
        'methods' in route
            ? route.methods
            : /** Sockets only allow get requests. */
              {
                  [HttpMethod.Get]: true,
              };

    if (!requestMethod || !allowedMethods[requestMethod]) {
        return {
            statusCode: HttpStatus.MethodNotAllowed,
        };
    } else {
        return undefined;
    }
}
