/**
 * Runtime value for {@link NoParam}.
 *
 * @category Internal
 */
export const NoParam = Symbol('no type parameter');
/**
 * Use to keep track of type parameters that are still generic and haven't received a specific type
 * yet.
 *
 * @category Internal
 */
export type NoParam = typeof NoParam;
