import {check} from '@augment-vir/assert';
import {
    addPrefix,
    filterMap,
    getObjectTypedEntries,
    HttpMethod,
    KeyCount,
    type ExtractKeysWithMatchingValues,
    type RequiredKeysOf,
    type SelectFrom,
} from '@augment-vir/common';
import {assertValidShape} from 'object-shape-tester';
import {type IsEqual, type IsNever} from 'type-fest';
import {buildUrl} from 'url-vir';
import type {PathParams} from '../endpoint/endpoint-path.js';
import {EndpointExecutorData, type Endpoint} from '../endpoint/endpoint.js';
import type {NoParam} from '../util/no-param.js';

/**
 * A general version of {@link FetchEndpointParams} to be used when accepting _any_ endpoint (like in
 * tests).
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type GenericFetchEndpointParams = {
    pathParams?: Record<string, string> | undefined;
    requestData?: any;
    method?: HttpMethod | undefined;
    options?: Omit<RequestInit, 'body' | 'method'> | undefined;
    /**
     * A custom fetch implementation. Useful for debugging or unit testing. This can safely be
     * omitted to use the default JavaScript built-in global `fetch` function.
     *
     * @default globalThis.fetch
     */
    fetch?: ((input: string, init: RequestInit) => Promise<Response>) | undefined;
};

/**
 * Type that determines which HTTP request methods can be used for the given endpoint definition.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type FetchMethod<EndpointToFetch extends Pick<Endpoint, 'methods'>> =
    IsEqual<
        KeyCount<Record<ExtractKeysWithMatchingValues<EndpointToFetch['methods'], true>, boolean>>,
        1
    > extends true
        ? never
        :
              | Extract<HttpMethod, ExtractKeysWithMatchingValues<EndpointToFetch['methods'], true>>
              | `${Extract<HttpMethod, ExtractKeysWithMatchingValues<EndpointToFetch['methods'], true>>}`;

/**
 * All type safe parameters for sending a request to an endpoint using {@link fetchEndpoint}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type FetchEndpointParams<
    EndpointToFetch extends SelectFrom<
        Endpoint,
        {
            endpointPath: true;
            requestDataShape: true;
            responseDataShape: true;
            methods: true;
        }
    >,
> = EndpointToFetch extends Endpoint
    ? Readonly<
          (IsNever<PathParams<EndpointToFetch['endpointPath']>> extends true
              ? {
                    /** This endpoint has no path parameters to configure. */
                    pathParams?: undefined;
                }
              : PathParams<EndpointToFetch['endpointPath']> extends string
                ? {
                      pathParams: Readonly<
                          Record<PathParams<EndpointToFetch['endpointPath']>, string>
                      >;
                  }
                : {
                      /** This endpoint has no path parameters to configure. */
                      pathParams?: undefined;
                  }) &
              (EndpointExecutorData<EndpointToFetch>['request'] extends undefined
                  ? {
                        /**
                         * This endpoint does not accept any request data, so there is none to be
                         * set.
                         */
                        requestData?: never;
                    }
                  : {
                        requestData: EndpointExecutorData<EndpointToFetch>['request'];
                    }) &
              (IsNever<FetchMethod<EndpointToFetch>> extends true
                  ? {
                        /**
                         * This endpoint only allows one method so it does not need to be
                         * configured.
                         */
                        method?: never;
                    }
                  : {
                        method: FetchMethod<EndpointToFetch>;
                    }) &
              Pick<GenericFetchEndpointParams, 'options' | 'fetch'>
      >
    : GenericFetchEndpointParams;

/**
 * Type safe output from sending a request to an endpoint definition. Used by {@link fetchEndpoint}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type FetchEndpointOutput<EndpointToFetch extends Endpoint | NoParam> = Readonly<{
    data: EndpointToFetch extends Endpoint
        ? EndpointExecutorData<EndpointToFetch>['response']
        : any;
    response: Readonly<Response>;
}>;

/**
 * Extracts an array of all allowed methods for the given endpoint definition.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function getAllowedEndpointMethods(
    endpoint: Readonly<Pick<Endpoint, 'methods'>>,
): HttpMethod[] {
    return filterMap(
        getObjectTypedEntries(endpoint.methods),
        ([
            methodName,
        ]) => methodName,
        (
            methodName,
            [
                ,
                allowed,
            ],
        ) => allowed,
    );
}

function filterToValidMethod(
    endpoint: Readonly<
        SelectFrom<
            Endpoint,
            {
                methods: true;
                endpointPath: true;
                service: {
                    serviceName: true;
                };
            }
        >
    >,
    chosenMethod: undefined | HttpMethod,
): HttpMethod {
    if (chosenMethod && (chosenMethod === HttpMethod.Options || endpoint.methods[chosenMethod])) {
        return chosenMethod;
    } else if (chosenMethod) {
        throw new Error(
            `Given HTTP method '${chosenMethod}' is not allowed for endpoint '${endpoint.endpointPath}' in service '${endpoint.service.serviceName}'`,
        );
    }

    const allowedMethods = getAllowedEndpointMethods(endpoint);

    if (check.isLengthExactly(allowedMethods, 1)) {
        return allowedMethods[0];
    } else if (allowedMethods.length) {
        throw new Error(
            `Endpoint '${endpoint.endpointPath}' in service '${endpoint.service.serviceName}' allows multiple HTTP methods, one must be chosen.`,
        );
    } else {
        throw new Error(
            `Endpoint '${endpoint.endpointPath}' in service '${endpoint.service.serviceName}' has no allowed HTTP methods. Requests cannot be sent.`,
        );
    }
}

/**
 * A wrapper for {@link FetchEndpointParams} that requires parameters based on the endpoint being
 * fetched.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type CollapsedFetchEndpointParams<EndpointToFetch extends Readonly<Endpoint> | NoParam> =
    EndpointToFetch extends NoParam
        ? [Readonly<GenericFetchEndpointParams>?]
        : Readonly<FetchEndpointParams<Exclude<EndpointToFetch, NoParam>>> extends infer RealParams
          ? RequiredKeysOf<RealParams> extends never
              ? [RealParams?]
              : [RealParams]
          : [];

/**
 * Send a request to an endpoint definition with type safe parameters.
 *
 * This can safely be used on a frontend _or_ backend.
 *
 * @category Fetch
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function fetchEndpoint<const EndpointToFetch extends Readonly<Endpoint> | NoParam>(
    endpoint: EndpointToFetch extends Endpoint ? EndpointToFetch : Endpoint,
    ...[
        {method, options, pathParams, requestData, fetch} = {},
    ]: CollapsedFetchEndpointParams<EndpointToFetch>
): Promise<FetchEndpointOutput<EndpointToFetch>> {
    if (requestData) {
        if (endpoint.requestDataShape) {
            assertValidShape(requestData, endpoint.requestDataShape);
        } else {
            throw new Error(
                `Request data was given but endpoint '${endpoint.endpointPath}' is not expecting any request data.`,
            );
        }
    }

    const url = buildEndpointUrl(endpoint, {pathParams});

    const requestInit: RequestInit = {
        ...options,
        method: filterToValidMethod(endpoint, method),
        ...(requestData ? {body: JSON.stringify(requestData)} : {}),
    };

    /* node:coverage ignore next: all tests mock fetch so we're never going to have a fallback here. */
    const response = await (fetch || globalThis.fetch)(url, requestInit);

    const responseData = endpoint.responseDataShape ? JSON.parse(await response.json()) : undefined;

    if (endpoint.responseDataShape) {
        assertValidShape(responseData, endpoint.responseDataShape);
    }

    return {
        data: responseData,
        response,
    };
}

/**
 * Creates and finalizes a URL for sending fetches to the given endpoint.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function buildEndpointUrl<
    const EndpointToFetch extends
        | Readonly<
              SelectFrom<
                  Endpoint,
                  {
                      endpointPath: true;
                      service: {
                          serviceOrigin: true;
                          serviceName: true;
                      };
                      methods: true;
                      requestDataShape: true;
                      responseDataShape: true;
                  }
              >
          >
        | NoParam = NoParam,
>(
    endpoint: EndpointToFetch extends Endpoint
        ? EndpointToFetch
        : SelectFrom<
              Endpoint,
              {
                  endpointPath: true;
                  service: {
                      serviceOrigin: true;
                      serviceName: true;
                  };
                  requestDataShape: true;
                  responseDataShape: true;
                  methods: true;
              }
          >,
    {
        pathParams,
    }: Pick<
        EndpointToFetch extends NoParam
            ? Readonly<GenericFetchEndpointParams>
            : Readonly<FetchEndpointParams<Exclude<EndpointToFetch, NoParam>>>,
        'pathParams'
    >,
): string {
    let pathParamsCount = 0;

    const builtUrl = buildUrl(endpoint.service.serviceOrigin, {
        pathname: endpoint.endpointPath.replaceAll(
            /\/:([^/]+)/g,
            (wholeMatch, paramName: string): string => {
                pathParamsCount++;
                if (pathParams && check.hasKey(pathParams, paramName) && pathParams[paramName]) {
                    return addPrefix({
                        value: pathParams[paramName],
                        prefix: '/',
                    });
                } else {
                    throw new Error(`Missing value for path param '${paramName}'.`);
                }
            },
        ),
    }).href;

    if (!pathParamsCount && pathParams) {
        throw new Error(
            `Endpoint '${endpoint.endpointPath}' in service '${endpoint.service.serviceName}' does not allow any path params but some where set.`,
        );
    }

    return builtUrl;
}
