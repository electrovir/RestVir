import {assert, check} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    HttpMethod,
    wrapInTry,
    type PartialWithUndefined,
    type SelectFrom,
} from '@augment-vir/common';
import {buildUrl, parseUrl} from 'url-vir';
import type {EndpointPathBase} from '../endpoint/endpoint-path.js';
import {GenericFetchEndpointParams} from '../frontend-connect/fetch-endpoint.js';
import type {ServiceDefinition} from '../service/define-service.js';

export type FindPortOptions = Pick<GenericFetchEndpointParams, 'fetch'> &
    PartialWithUndefined<{
        /**
         * The maximum number of ports that are scanned before giving up.
         *
         * @default 100
         */
        maxScanDistance: number;
    }>;

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
    options: Readonly<FindPortOptions> = {},
): Promise<{
    port: number;
    origin: string;
}> {
    try {
        const endpoint = Object.values(service.endpoints)[0];
        if (!endpoint) {
            throw new Error(`Service has no endpoints.`);
        }

        const port = await findLivePort(service.serviceOrigin, endpoint.path, options);

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

export async function findLivePort(
    originWithStartingPort: string,
    pathToCheck: EndpointPathBase,
    {fetch = globalThis.fetch, maxScanDistance = 100}: Readonly<FindPortOptions> = {},
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

        if (!check.instanceOf(response, Error) && response.ok) {
            foundValidPort = true;
        } else if (findDistance >= maxScanDistance) {
            throw new Error(`Max scan distance reached. Last scanned port: ${port}`);
        } else {
            findDistance++;
        }
    }

    return findDistance + startingPort;
}
