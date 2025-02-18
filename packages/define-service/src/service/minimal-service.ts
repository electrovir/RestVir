import {type IsEqual} from 'type-fest';
import {type OriginRequirement} from '../util/origin.js';

/**
 * This is a minimal service definition with only data to send and handle fetch requests to that
 * service. Each endpoint definition gets a copy of this embedded into it so the endpoint alone can
 * be used as an input to the endpoint fetch function.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MinimalService<ServiceName extends string = string> = {
    serviceName: IsEqual<ServiceName, ''> extends true ? never : ServiceName;
    /**
     * The origin at which the service will be hosted. Fetch requests and WebSocket connections will
     * be sent to this service will be sent to this origin.
     *
     * It is recommended to use a ternary to switch between dev and prod origins.
     *
     * @example
     *
     * ```ts
     * import {defineService} from '@rest-vir/define-service';
     *
     * defineService({
     *     serviceOrigin: isDev ? 'http://localhost:3000' : 'https://example.com',
     * });
     * ```
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Location for help on which part of the URL is the origin (if necessary).
     */
    serviceOrigin: string;
    /**
     * The service's `origin` requirement for all endpoint requests and WebSocket connections. This
     * is used for CORS handshakes.
     *
     * This can be a string, a RegExp, a function, or an array of any of those. (If this is an
     * array, the first matching array element will be used.)
     *
     * Set this to `AnyOrigin` (imported from `'@rest-vir/define-service'`) to allow any origins.
     * Make sure that you're okay with the security impact this may have on your users of doing so.
     */
    requiredClientOrigin: NonNullable<OriginRequirement>;
};
