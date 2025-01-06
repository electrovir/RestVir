import type {IsEqual} from 'type-fest';

/**
 * This is a minimal service definition with only sufficient data to send fetch requests to that
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
     * The origin through which the service can be contacted. This will be used by the endpoint
     * fetch function to send requests to this service.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Location for help on which part of the URL is the origin (if necessary).
     */
    serviceOrigin: string;
};
