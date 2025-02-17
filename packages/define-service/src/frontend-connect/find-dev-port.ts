import {assert, check, waitUntil} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    HttpMethod,
    wrapInTry,
    type MaybePromise,
    type PartialWithUndefined,
    type SelectFrom,
} from '@augment-vir/common';
import {buildUrl, parseUrl} from 'url-vir';
import type {EndpointPathBase} from '../endpoint/endpoint-path.js';
import type {ServiceDefinition} from '../service/service-definition.js';
import {GenericFetchEndpointParams} from './fetch-endpoint.js';

/**
 * This header is set on all responses handled by rest-vir so we know what service a response came
 * from.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export const restVirServiceNameHeader = 'rest-vir-service';

/**
 * Options for {@link findDevServicePort} and {@link findLivePort}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type FindPortOptions = Pick<GenericFetchEndpointParams, 'fetch'> &
    PartialWithUndefined<{
        /**
         * The maximum number of ports that are scanned before giving up.
         *
         * @default 100
         */
        maxScanDistance: number;
        /**
         * A callback that is used to determine if a port's response is valid.
         *
         * If this is not provided, the check is simply `!!response.ok`.
         *
         * If this is provided, returning `true` determines that a port response is valid. This will
         * only be called if `response.ok` is already `true`.
         */
        isValidResponse: (response: Readonly<Response>) => MaybePromise<boolean>;
    }>;

/**
 * Use this to find a service's port number when started without a locked-in port. This allows a
 * client (usually a website frontend) to find which port the server started on by scanning ports
 * starting with the port defined in the service's `serviceOrigin` property.
 *
 * If the service has no port in its `serviceOrigin` property, this function throws an error.
 *
 * Note that the service given must have at least one endpoint defined for this function to work.
 *
 * This is used in `defineService` if the `findActiveDevPort` option is set to true.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @example
 *
 * ```ts
 * import {findDevServicePort, defineService, AnyOrigin} from '@rest-vir/define-service';
 *
 * const myService = await defineService({
 *     serviceName: 'my-service',
 *     serviceOrigin: 'https://localhost:3000',
 *     requiredClientOrigin: AnyOrigin,
 *     endpoints: {
 *         '/my-path': {
 *             methods: {
 *                 [HttpMethod.Get]: true,
 *             },
 *             requestDataShape: undefined,
 *             responseDataShape: undefined,
 *         },
 *     },
 * });
 *
 * const {origin} = await findDevServicePort(myService);
 * ```
 *
 * @throws Error if no valid starting port can be found or if the max scan distance has been reached
 *   without finding a valid port.
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function findDevServicePort(
    service: Readonly<
        SelectFrom<
            ServiceDefinition,
            {
                endpoints: true;
                serviceOrigin: true;
                serviceName: true;
            }
        >
    >,
    options: Readonly<Omit<FindPortOptions, 'isValidResponse'>> = {},
): Promise<{
    port: number;
    origin: string;
}> {
    try {
        const endpoint = Object.values(service.endpoints)[0];
        if (!endpoint) {
            throw new Error(`Service has no endpoints.`);
        }

        const port = await waitUntil.isNumber(() =>
            findLivePort(service.serviceOrigin, endpoint.path, {
                ...options,
                isValidResponse(response) {
                    return response.headers.get(restVirServiceNameHeader) === service.serviceName;
                },
            }),
        );

        const {origin} = buildUrl(service.serviceOrigin, {
            port,
        });

        return {
            port,
            origin,
        };
    } catch (error) {
        throw ensureErrorAndPrependMessage(
            error,
            `Cannot find dev origin for service '${service.serviceName}'`,
        );
    }
}

/**
 * Find the first port, starting with the port in the given origin, that, with the given path, is
 * alive and matches, if provided, `isValidResponse`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @throws Error if no valid starting port can be found or if the max scan distance has been reached
 *   without finding a valid port.
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function findLivePort(
    originWithStartingPort: string,
    pathToCheck: EndpointPathBase,
    {
        fetch = globalThis.fetch,
        maxScanDistance = 100,
        isValidResponse,
    }: Readonly<FindPortOptions> = {},
): Promise<number> {
    const {port: originalPort} = parseUrl(originWithStartingPort);
    if (!originalPort) {
        throw new Error(`Given origin doesn't use a port.`);
    }

    const startingPort = Number(originalPort);

    assert.isNumber(startingPort, `Given origin doesn't have a valid port.`);

    let findDistance: number = 0;

    let foundValidPort = false;

    while (!foundValidPort) {
        const port = findDistance + startingPort;

        const newUrl = buildUrl(originWithStartingPort, {
            pathname: pathToCheck,
            port,
        }).href;

        const response = await wrapInTry(() =>
            fetch(newUrl, {
                method: HttpMethod.Options,
            }),
        );

        if (
            !check.instanceOf(response, Error) &&
            response.ok &&
            (isValidResponse ? isValidResponse(response) : true)
        ) {
            foundValidPort = true;
        } else if (findDistance >= maxScanDistance) {
            throw new Error(`Max scan distance reached. Last scanned port: ${port}`);
        } else {
            findDistance++;
        }
    }

    return findDistance + startingPort;
}
