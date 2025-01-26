import {assert, assertWrap} from '@augment-vir/assert';
import {
    mapObjectValues,
    mergeDeep,
    mergeDefinedProperties,
    omitObjectKeys,
    type AnyObject,
    type PartialWithUndefined,
    type SelectFrom,
} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {
    buildEndpointRequestInit,
    CollapsedFetchEndpointParams,
    Endpoint,
    type NoParam,
} from '@rest-vir/define-service';
import {type GenericServiceImplementation} from '@rest-vir/implement-service';
import {type InjectOptions} from 'light-my-request';
import {type OutgoingHttpHeaders} from 'node:http';
import {buildUrl, parseUrl} from 'url-vir';
import {type StartServiceUserOptions} from '../start-service/start-service-options.js';
import {startService} from '../start-service/start-service.js';

/**
 * Options for {@link condenseResponse}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type CondenseResponseOptions = {
    /**
     * Include all headers that fastify automatically appends.
     *
     * @default false
     */
    includeFastifyHeaders: boolean;
};

/**
 * Condense a response into just the interesting properties for easier testing comparisons.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function condenseResponse(
    response: Response,
    options: PartialWithUndefined<CondenseResponseOptions> = {},
) {
    const bodyText = await response.text();
    const bodyObject = bodyText
        ? {
              body: bodyText,
          }
        : {};

    const headers: OutgoingHttpHeaders = Object.fromEntries(response.headers.entries());

    return {
        status: assertWrap.isHttpStatus(response.status),
        ...bodyObject,
        headers: options.includeFastifyHeaders
            ? headers
            : omitObjectKeys(headers, [
                  /**
                   * These headers are automatically set by fastify so we don't care about
                   * inspecting them in tests.
                   */
                  'connection',
                  'content-length',
                  'date',
                  'keep-alive',
              ]),
    };
}

/**
 * Used for each individual endpoint's fetcher in {@link FetchTestService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type FetchTestEndpoint<EndpointToTest extends Endpoint> = (
    ...params: CollapsedFetchEndpointParams<EndpointToTest, false>
) => Promise<Response>;

/**
 * Type for the `fetchService` function provided by {@link testService} and {@link describeService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type FetchTestService<
    Service extends SelectFrom<
        GenericServiceImplementation,
        {
            endpoints: true;
        }
    >,
> = {
    [EndpointPath in keyof Service['endpoints']]: Service['endpoints'][EndpointPath] extends Endpoint
        ? FetchTestEndpoint<Service['endpoints'][EndpointPath]>
        : never;
};

/**
 * Test your service with actual Request and Response objects!
 *
 * The returned object includes a function to send fetches to directly to the running service. See
 * also {@link describeService}, which uses this function.
 *
 * By default, this uses Fastify's request injection strategy to avoid using up real system ports.
 * To instead listen to an actual port, set `port` in the options parameter.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function testService<
    const Service extends Readonly<
        SelectFrom<
            GenericServiceImplementation,
            {
                endpoints: true;
                serviceName: true;
                logger: true;
            }
        >
    >,
>(
    service: Readonly<Service>,
    testServiceOptions: Omit<
        PartialWithUndefined<StartServiceUserOptions>,
        'workerCount' | 'preventWorkerRespawn'
    > = {},
) {
    const {kill, port, host, server} = await startService(
        service,
        mergeDefinedProperties<StartServiceUserOptions>(
            {
                port: false,
            },
            testServiceOptions,
            {
                workerCount: 1,
                preventWorkerRespawn: true,
            },
        ),
    );

    assert.isDefined(server, 'Service server was not started.');

    const fetchOrigin =
        port == undefined
            ? undefined
            : buildUrl({
                  protocol: 'http',
                  hostname: host,
                  port,
              }).origin;

    const fetchService = mapObjectValues(
        service.endpoints as GenericServiceImplementation['endpoints'],
        (endpointKey, endpoint) => {
            return async (
                ...args: CollapsedFetchEndpointParams<NoParam, false>
            ): Promise<Response> => {
                const overwrittenOriginEndpoint = mergeDeep(
                    endpoint as Endpoint,
                    fetchOrigin
                        ? {
                              service: {
                                  serviceOrigin: fetchOrigin,
                              },
                          }
                        : {},
                );

                const {url, requestInit} = buildEndpointRequestInit<NoParam>(
                    overwrittenOriginEndpoint,
                    ...args,
                );

                const {href, fullPath} = parseUrl(url);

                if (fetchOrigin == undefined) {
                    const withPayload: Pick<InjectOptions, 'body'> = requestInit.body
                        ? {
                              body: requestInit.body,
                          }
                        : {};

                    const innerResponse = await server.inject({
                        remoteAddress: href,
                        headers: requestInit.headers as Record<string, string>,
                        method: requestInit.method as NonNullable<InjectOptions['method']>,
                        url: fullPath,
                        ...withPayload,
                    });

                    const response = new Response(innerResponse.rawPayload, {
                        status: innerResponse.statusCode,
                        headers: innerResponse.headers as Record<string, string>,
                        statusText: innerResponse.statusMessage,
                    });

                    return response;
                } else {
                    return globalThis.fetch(href, requestInit);
                }
            };
        },
    ) as AnyObject as FetchTestService<Service>;

    return {
        /**
         * Kill the service. Make sure to call this at the end of the test or the service will
         * simply keep running.
         */
        kill,
        /** Send a request to the service. */
        fetchService,
    };
}

/**
 * Use this in conjunction with
 * [`@augment-vir/test`](https://www.npmjs.com/package/@augment-vir/test) or the Node.js built-in
 * test runner to run tests for a service and automatically kill the service when all tests have
 * finished. The describe callback is passed a params object which includes a fetch function.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @example
 *
 * ```ts
 * import {describeService} from '@rest-vir/run-service';
 * import {it} from '@augment-vir/test';
 *
 * describeService({service: myService}, ({fetchService}) => {
 *     it('responds', async () => {
 *         const response = await fetchService['/my-endpoint']();
 *     });
 * });
 * ```
 *
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function describeService<
    const Service extends Readonly<
        SelectFrom<
            GenericServiceImplementation,
            {
                endpoints: true;
                serviceName: true;
                logger: true;
            }
        >
    >,
>(
    {
        service,
        options,
    }: {
        /** The service to startup and send requests to. */
        service: Readonly<Service>;
        /** Options for starting the service. */
        options?: PartialWithUndefined<StartServiceUserOptions>;
    },
    describeCallback: (params: {
        /** Send a request to the service. */
        fetchService: FetchTestService<Service>;
    }) => void | undefined,
) {
    const servicePromise = testService(service, options);

    const fetchServiceObject = mapObjectValues(service.endpoints, (endpointPath) => {
        return async (...args: any[]) => {
            const {fetchService} = await servicePromise;
            return await fetchService[endpointPath](...(args as any));
        };
    }) as FetchTestService<Service>;

    describe(service.serviceName, () => {
        describeCallback({
            fetchService: fetchServiceObject,
        });

        /**
         * The built-in Node.js test runner runs `it` calls sequentially so this will always be
         * called last.
         */
        it('can be killed', async () => {
            const {kill} = await servicePromise;
            kill();
        });
    });
}
