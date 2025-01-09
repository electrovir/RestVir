import {check} from '@augment-vir/assert';
import {type AnyObject} from '@augment-vir/common';
import {
    ContextInit,
    EndpointImplementationParams,
    ServiceImplementation,
} from '@rest-vir/implement-service';

/**
 * Creates the endpoint handler, user-defined `Context` for the given service.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
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
