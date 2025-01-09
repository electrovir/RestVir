import type {AnyObject} from '@augment-vir/common';
import type {HttpMethod} from '@rest-vir/define-service';
import type {EndpointRequest} from '@rest-vir/implement-service';
import type {IncomingHttpHeaders} from 'node:http';
import type {OmitIndexSignature} from 'type-fest';

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
    headers?: Record<keyof OmitIndexSignature<IncomingHttpHeaders>, string>;
}) {
    return init satisfies Partial<EndpointRequest> as AnyObject as EndpointRequest;
}
