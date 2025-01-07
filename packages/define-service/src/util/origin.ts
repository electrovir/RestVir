import {MaybePromise} from '@augment-vir/common';

/** Explicity denotes that any origin is allowed. */
export const AnyOrigin = Symbol('any-origin');

/** Type for {@link AnyOrigin} symbol. */
export type AnyOrigin = typeof AnyOrigin;

/**
 * Options explained:
 *
 * - `undefined`: when on an endpoint, this denotes that the endpoint defers origin checks to the
 *   parent service's origin requirement. When on the service, `undefined` is not allowed.
 * - `string`: require all request origins to exactly match the given string.
 * - `RegExp`: all request origins must match the RegExp.
 * - {@link AnyOrigin}: allow any origin.
 * - A function: allow custom checking. If this function returns something truthy, the origin is
 *   allowed.
 * - An array: a combination of `string` values, `RegExp` values, or functions to compare against. If
 *   any of the array entries allow a request origin, it passes.
 */
export type OriginRequirement =
    | undefined
    | string
    | RegExp
    | AnyOrigin
    | (((origin: string | undefined) => MaybePromise<boolean>) | string | RegExp)[]
    | ((origin: string | undefined) => MaybePromise<boolean>);
