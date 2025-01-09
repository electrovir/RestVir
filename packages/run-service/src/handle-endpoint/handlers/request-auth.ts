import {EndpointImplementationParams, ServiceImplementation} from '@rest-vir/implement-service';

/**
 * Extracts the endpoint handler, user-defined auth for the given service.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function extractAuth(
    params: Omit<EndpointImplementationParams, 'auth'>,
    serviceImplementation: Readonly<ServiceImplementation>,
) {
    if (!serviceImplementation.allowedAuth) {
        return undefined;
    }

    return await serviceImplementation.extractAuth?.(params);
}
