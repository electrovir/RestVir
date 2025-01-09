import {getObjectTypedEntries} from '@augment-vir/common';
import {MinimalResponse} from '../handle-endpoint/response.js';

/**
 * An object of headers to set. Used in {@link setResponseHeaders}.
 *
 * Any headers set to `undefined` will be removed and not set.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type HeadersToSet = Record<string, string | string[] | undefined>;

/**
 * Easily apply an object of headers to a Response object.
 *
 * @category Util
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function setResponseHeaders(
    response: Readonly<Pick<MinimalResponse, 'setHeader' | 'removeHeader'>>,
    headers: Readonly<HeadersToSet>,
): void {
    getObjectTypedEntries(headers).forEach(
        ([
            name,
            value,
        ]) => {
            if (value == undefined) {
                response.removeHeader(name);
            } else {
                response.setHeader(name, value);
            }
        },
    );
}
