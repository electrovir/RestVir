/**
 * The base, generic type for a parsed search params object, extracted from a request URL. If there
 * are no search params, this will be an empty object.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type BaseSearchParams = Record<string, string[]>;
