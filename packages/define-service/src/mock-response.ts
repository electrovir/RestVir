import type {AnyObject, JsonCompatibleValue} from '@augment-vir/common';

/**
 * Mocks a `Response` object. Currently this only implements the `json` method.
 *
 * @category Util
 */
export function createMockResponse(responseData?: JsonCompatibleValue | undefined): Response {
    return {
        json() {
            return JSON.stringify(responseData);
        },
    } as AnyObject as Response;
}
