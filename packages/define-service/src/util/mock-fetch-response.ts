import type {AnyObject, JsonCompatibleValue} from '@augment-vir/common';

/**
 * Mocks a fetch's `Response` value. Currently this only implements the `json` method.
 *
 * @category Testing
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockFetchResponse(responseData?: JsonCompatibleValue | undefined): Response {
    return {
        json() {
            return JSON.stringify(responseData);
        },
    } as AnyObject as Response;
}
