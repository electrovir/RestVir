import {combineErrorMessages, type SelectFrom} from '@augment-vir/common';
import type {Endpoint} from '@rest-vir/define-service';

/**
 * An error thrown internally from rest-vir's while handling an endpoint request. This will not
 * include errors thrown by the endpoint implementation itself.
 *
 * The default service logger will only log the message of these errors, not the whole stack track
 * (so logs are easier to read).
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export class InternalEndpointError extends Error {
    public override readonly name = 'InternalEndpointError';

    constructor(
        endpoint: Readonly<
            SelectFrom<Endpoint, {endpointPath: true; service: {serviceName: true}}>
        >,
        message: string,
    ) {
        super(combineErrorMessages(createEndpointErrorPrefix(endpoint), message));
    }
}

/**
 * Creates the endpoint error string used by {@link InternalEndpointError}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function createEndpointErrorPrefix(
    endpoint: Readonly<SelectFrom<Endpoint, {endpointPath: true; service: {serviceName: true}}>>,
) {
    return `Endpoint '${endpoint.endpointPath}' failed in service '${endpoint.service.serviceName}'`;
}
