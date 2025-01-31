import {getObjectTypedKeys} from '@augment-vir/common';
import type {RequireAtLeastOne} from 'type-fest';
import {parseUrl} from 'url-vir';
import {EndpointPathBase} from '../endpoint/endpoint-path.js';
import {match} from '../util/path-to-regexp.js';

/**
 * Given a raw path or URL, finds an endpoint or socket path that will match in the given service.
 * If no match is found, this returns `undefined`.
 *
 * @category Util
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function matchUrlToService<
    const Service extends Readonly<{
        sockets: Record<EndpointPathBase, any>;
        endpoints: Record<EndpointPathBase, any>;
    }>,
>(
    this: void,
    service: Service,
    /** The URL or path to match against. */
    url: string,
): MatchedServicePath<Service> | undefined {
    const {pathname} = parseUrl(url);

    const endpointPath = getObjectTypedKeys(service.endpoints).find((endpointPath) => {
        return match(endpointPath)(pathname);
    });
    const socketPath = getObjectTypedKeys(service.sockets).find((socketPath) => {
        return match(socketPath)(pathname);
    });

    if (!endpointPath && !socketPath) {
        return undefined;
    } else {
        return {
            ...(endpointPath ? {endpointPath} : {}),
            ...(socketPath ? {socketPath} : {}),
        } satisfies Partial<MatchedServicePath<Service>> as MatchedServicePath<Service>;
    }
}

/**
 * Output for {@link matchUrlToService}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type MatchedServicePath<
    Service extends Readonly<{
        sockets: Record<EndpointPathBase, any>;
        endpoints: Record<EndpointPathBase, any>;
    }>,
> = RequireAtLeastOne<{
    socketPath: keyof Service['sockets'];
    endpointPath: keyof Service['endpoints'];
}>;
