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
import {buildEndpointUrl, Endpoint, FetchEndpointParams} from '@rest-vir/define-service';
import type {GenericServiceImplementation} from '@rest-vir/implement-service';
import type {OutgoingHttpHeaders} from 'node:http';
import type {IsEqual} from 'type-fest';
import {buildUrl} from 'url-vir';
import type {StartServiceUserOptions} from '../start-service/start-service-options.js';
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
 * Params for the {@link FetchTestService} which is provided by {@link testService} and
 * {@link describeService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type FetchTestServiceParams<
    PathParams extends Record<string, string> | undefined = undefined,
> = (IsEqual<PathParams, undefined> extends true
    ? {
          /** Empty path params for endpoints without any. */
          pathParams?: never;
      }
    : {
          /** Path params for the endpoint in use. */
          pathParams: PathParams;
      }) & {
    /** Request init parameters. */
    init?: RequestInit | undefined;
};

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
        ? IsEqual<
              FetchEndpointParams<Service['endpoints'][EndpointPath]>['pathParams'],
              undefined
          > extends true
            ? (
                  params?:
                      | FetchTestServiceParams<
                            FetchEndpointParams<Service['endpoints'][EndpointPath]>['pathParams']
                        >
                      | undefined,
              ) => Promise<Response>
            : (
                  params:
                      | FetchTestServiceParams<
                            FetchEndpointParams<Service['endpoints'][EndpointPath]>['pathParams']
                        >
                      | undefined,
              ) => Promise<Response>
        : never;
};

/**
 * Run this to startup your service with actual full request and response handling. This returns a
 * function to send fetches to directly to the running service. See also {@link describeService},
 * which uses this function.
 *
 * To listen to an actual port, set `port` in the options parameter. Otherwise, a port doesn't need
 * to be used to run tests (thus allowing maximum test parallelization).
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
            return async (params: FetchTestServiceParams = {}): Promise<Response> => {
                if (fetchOrigin == undefined) {
                    const innerResponse = await server.inject({
                        url: endpoint.endpointPath,
                    });

                    const response = new Response(innerResponse.rawPayload, {
                        status: innerResponse.statusCode,
                        headers: innerResponse.headers as Record<string, string>,
                        statusText: innerResponse.statusMessage,
                    });

                    return response;
                } else {
                    const overwrittenOriginEndpoint = mergeDeep(endpoint as Endpoint, {
                        service: {
                            serviceOrigin: fetchOrigin,
                        },
                    });

                    const url = buildEndpointUrl<any>(overwrittenOriginEndpoint, {
                        pathParams: params.pathParams,
                    });

                    return globalThis.fetch(url, params.init);
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
            return await fetchService[endpointPath](...(args as [any]));
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
