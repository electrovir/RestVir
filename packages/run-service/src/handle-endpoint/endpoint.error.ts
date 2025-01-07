import type {SelectFrom} from '@augment-vir/common';
import type {Endpoint} from '@rest-vir/define-service';

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
