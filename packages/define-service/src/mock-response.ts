import type {AnyObject, JsonCompatibleValue} from '@augment-vir/common';

/**
 * Mocks a `Response` object. Currently this only implements the `json` method.
 *
 * @category Util
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockResponse(responseData?: JsonCompatibleValue | undefined): Response {
    return {
        json() {
            return JSON.stringify(responseData);
        },
    } as AnyObject as Response;
}
