import type {HttpMethod} from '@rest-vir/define-service';
import type {MinimalRequest} from '@rest-vir/implement-service';
import type {IncomingHttpHeaders} from 'node:http';

/**
 * Creates a mock Request object for backend endpoint testing.
 *
 * @category Util
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function createMockRequest(init: {
    method: HttpMethod;
    body?: unknown;
    headers?: IncomingHttpHeaders;
}) {
    return init satisfies Partial<MinimalRequest> as MinimalRequest;
}
