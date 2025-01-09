import type {SelectFrom} from '@augment-vir/common';
import type {Endpoint} from '@rest-vir/define-service';

/**
 * An error thrown from an endpoint while handling it.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export class EndpointError extends Error {
    constructor(
        endpoint: Readonly<
            SelectFrom<Endpoint, {endpointPath: true; service: {serviceName: true}}>
        >,
        message: string,
    ) {
        super(
            `Endpoint '${endpoint.endpointPath}' failed in service '${endpoint.service.serviceName}': ${message}`,
        );
    }
}
