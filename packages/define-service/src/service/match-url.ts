import {getObjectTypedKeys} from '@augment-vir/common';
import {type RequireAtLeastOne} from 'type-fest';
import {parseUrl} from 'url-vir';
import {EndpointPathBase} from '../endpoint/endpoint-path.js';
import {match} from '../util/path-to-regexp.js';

/**
 * Given a raw path or URL, finds an endpoint or WebSocket path that will match in the given
 * service. If no match is found, this returns `undefined`.
 *
 * @category Util
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function matchUrlToService<
    const Service extends Readonly<{
        webSockets: Record<EndpointPathBase, any>;
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
    const webSocketPath = getObjectTypedKeys(service.webSockets).find((webSocketPath) => {
        return match(webSocketPath)(pathname);
    });

    if (!endpointPath && !webSocketPath) {
        return undefined;
    } else {
        return {
            ...(endpointPath ? {endpointPath} : {}),
            ...(webSocketPath ? {webSocketPath: webSocketPath} : {}),
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
        webSockets: Record<EndpointPathBase, any>;
        endpoints: Record<EndpointPathBase, any>;
    }>,
> = RequireAtLeastOne<{
    webSocketPath: keyof Service['webSockets'];
    endpointPath: keyof Service['endpoints'];
}>;
