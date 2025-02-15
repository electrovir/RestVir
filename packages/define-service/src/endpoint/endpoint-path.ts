import {assert} from '@augment-vir/assert';

/**
 * Extracts all path parameters from an endpoint path.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type PathParams<EndpointPath extends string> = string extends EndpointPath
    ? Record<string, string>
    : EndpointPath extends `${string}:${infer Param}/${infer Rest}`
      ? Param | PathParams<`/${Rest}`>
      : EndpointPath extends `${string}:${infer Param}`
        ? Param
        : never;

/**
 * Base requirement for endpoint paths.
 *
 * Note that this whole thing should be lowercase. Technically, we should use `Lowercase<string>`
 * because of that. However, that makes the type requirements way too strict and hard to deal with.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointPathBase = `/${string}` | '/';

/**
 * Asserts that the given endpoint or WebSocket path is valid.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function assertValidEndpointPath(path: string) {
    if (path !== '/') {
        assert.startsWith(path, '/', 'Path does not start with /');
        assert.endsWithout(path, '/', 'Path cannot end with /');
    }
}
