import {EndpointImplementationParams, ServiceImplementation} from '@rest-vir/implement-service';

export async function extractAuth(
    params: Omit<EndpointImplementationParams, 'auth'>,
    serviceImplementation: Readonly<ServiceImplementation>,
) {
    if (!serviceImplementation.allowedAuth) {
        return undefined;
    }

    return await serviceImplementation.extractAuth?.(params);
}
