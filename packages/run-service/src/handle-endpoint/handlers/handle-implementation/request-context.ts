import {
    ContextInitParameters,
    type GenericServiceImplementation,
} from '@rest-vir/implement-service';

/**
 * Creates the endpoint handler, user-defined `Context` for the given service.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function createContext(
    params: Readonly<ContextInitParameters>,
    service: Readonly<Pick<GenericServiceImplementation, 'createContext'>>,
) {
    return await service.createContext?.(params);
}
