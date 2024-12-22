/**
 * Extracts all path parameters from an endpoint path.
 *
 * @category Endpoint
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
 */
export type EndpointPathBase = `/${string}`;
