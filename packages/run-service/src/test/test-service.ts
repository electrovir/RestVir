import {
    mapObjectValues,
    mergeDeep,
    mergeDefinedProperties,
    randomInteger,
    type AnyObject,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {buildEndpointUrl, Endpoint, FetchEndpointParams} from '@rest-vir/define-service';
import type {GenericServiceImplementation} from '@rest-vir/implement-service';
import type {IsEqual} from 'type-fest';
import {buildUrl} from 'url-vir';
import type {StartServiceUserOptions} from '../start-service/start-service-options.js';
import {startService} from '../start-service/start-service.js';

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
export type FetchTestService<Service extends GenericServiceImplementation> = {
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
 * Run this to startup your service on an actual port for testing purposes. This returns a function
 * to send fetches to directly to the running service. See also {@link describeService}, which uses
 * this function.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function testService<const Service extends GenericServiceImplementation>(
    service: Readonly<Service>,
    testServiceOptions: PartialWithUndefined<StartServiceUserOptions> = {},
) {
    const {kill, port, host} = await startService(
        service,
        mergeDefinedProperties<StartServiceUserOptions>(
            {
                port: 3000 + randomInteger({min: 0, max: 5000}),
                workerCount: 1,
            },
            testServiceOptions,
        ),
    );

    const fetchOrigin = buildUrl({
        protocol: 'http',
        hostname: host,
        port,
    }).origin;

    const fetchService = mapObjectValues(service.endpoints, (endpointKey, endpoint) => {
        return (params: FetchTestServiceParams = {}): Promise<Response> => {
            const overwrittenOriginEndpoint = mergeDeep(endpoint as Endpoint, {
                service: {
                    serviceOrigin: fetchOrigin,
                },
            });

            const url = buildEndpointUrl<any>(overwrittenOriginEndpoint, {
                pathParams: params.pathParams,
            });

            return globalThis.fetch(url, params.init);
        };
    }) as AnyObject as FetchTestService<Service>;

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
export function describeService<const Service extends GenericServiceImplementation>(
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
