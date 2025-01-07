import {check} from '@augment-vir/assert';
import {type AnyObject} from '@augment-vir/common';
import {
    ContextInit,
    EndpointImplementationParams,
    ServiceImplementation,
} from '@rest-vir/implement-service';

export async function createContext(
    params: Omit<EndpointImplementationParams, 'context' | 'auth'>,
    serviceImplementation: Readonly<ServiceImplementation>,
) {
    const contextInput: ContextInit<AnyObject> = serviceImplementation.context;

    if (check.isFunction(contextInput)) {
        return contextInput(params);
    } else {
        return contextInput;
    }
}
