import {wrapInTry} from '@augment-vir/common';

/**
 * Parses a JSON string and converts `'undefined'` to `undefined`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function parseJsonWithUndefined(data: string): any {
    return wrapInTry(() => JSON.parse(data), {
        fallbackValue: data === 'undefined' ? undefined : data,
    });
}
