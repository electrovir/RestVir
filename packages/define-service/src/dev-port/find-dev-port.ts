import {assert, check, waitUntil} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    HttpMethod,
    wrapInTry,
    type MaybePromise,
    type PartialWithUndefined,
    type SelectFrom,
} from '@augment-vir/common';
import {convertDuration, type AnyDuration} from 'date-vir';
import {buildUrl, parseUrl} from 'url-vir';
import type {EndpointPathBase} from '../endpoint/endpoint-path.js';
import {GenericFetchEndpointParams} from '../frontend-connect/fetch-endpoint.js';
import {defineService} from '../service/define-service.js';
import type {ServiceDefinition} from '../service/service-definition.js';

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
        /**
         * Max duration that port finding is allowed to go on for.
         *
         * @default {seconds: 10}
         */
        timeout: AnyDuration;
        /**
         * A starting origin used to replace the service definition's origin, in case you need to
         * keep your service definition's origin static for API publishing purposes.
         *
         * This defaults to whatever origin is already set on the given service definition.
         */
        startingOriginOverride: string;
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
 * const myService = defineService({
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
        const startingOrigin = options.startingOriginOverride || service.serviceOrigin;

        const endpoint = Object.values(service.endpoints)[0];
        if (!endpoint) {
            throw new Error(`Service has no endpoints.`);
        }

        const port = await waitUntil.isNumber(
            () =>
                findLivePort(startingOrigin, endpoint.path, {
                    ...options,
                    isValidResponse(response) {
                        return (
                            response.headers.get(restVirServiceNameHeader) === service.serviceName
                        );
                    },
                }),
            {
                timeout: options.timeout,
            },
        );

        const {origin} = buildUrl(startingOrigin, {
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
        timeout = {seconds: 10},
    }: Readonly<Omit<FindPortOptions, 'overwriteOrigin'>> = {},
): Promise<number> {
    const {port: originalPort} = parseUrl(originWithStartingPort);
    if (!originalPort) {
        throw new Error(`Given origin doesn't use a port.`);
    }

    const startingPort = Number(originalPort);

    assert.isNumber(startingPort, `Given origin doesn't have a valid port.`);

    let findDistance: number = 0;

    let foundValidPort = false;

    const timeoutMs = convertDuration(timeout, {milliseconds: true}).milliseconds;

    const startTime = Date.now();

    while (!foundValidPort) {
        const port = findDistance + startingPort;
        if (Date.now() - startTime >= timeoutMs) {
            throw new Error(`Port scan timeout reached. Last scanned port: ${port - 1}`);
        }

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
            throw new Error(`Max port scan distance reached. Last scanned port: ${port}`);
        } else {
            findDistance++;
        }
    }

    return findDistance + startingPort;
}

/**
 * Creates a copy of a service definition (without mutating the original service definition) for dev
 * environments where the service's port has been modified to match an actual running instance of
 * this service.
 *
 * This is useful for situations where your backend in dev automatically starts on a different port
 * if the original port is already in use.
 *
 * @category Define Service
 * @category Package : @rest-vir/define-service
 * @example
 *
 * ```ts
 * import {mapServiceDevPort} from '@rest-vir/define-service';
 *
 * const mappedService = await mapServiceDevPort(myServiceDefinition);
 * ```
 *
 * @throws Error if no valid starting port can be found or if the max scan distance has been reached
 *   without finding a valid port.
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export async function mapServiceDevPort<const SpecificService extends ServiceDefinition>(
    service: Readonly<SpecificService>,
    options: Readonly<Omit<FindPortOptions, 'isValidResponse'>> = {},
): Promise<SpecificService> {
    const {origin} = await findDevServicePort(service, options);

    return defineService({
        ...service.init,
        serviceOrigin: origin,
    }) as SpecificService;
}
