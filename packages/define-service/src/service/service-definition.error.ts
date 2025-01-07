import {stringify} from '@augment-vir/common';

/**
 * An error thrown by endpoint and service validation assertions.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export class ServiceDefinitionError extends Error {
    public override name = 'ServiceDefinitionError';
    constructor({
        serviceName,
        endpointPath,
        errorMessage,
    }: {
        serviceName: string;
        endpointPath: unknown;
        errorMessage: string;
    }) {
        const serviceNameMessage = `service '${serviceName}'`;

        const nameMessage = endpointPath
            ? `endpoint '${stringify(endpointPath)}' on ${serviceNameMessage}`
            : serviceNameMessage;

        const fullErrorMessage = `Failed to define ${nameMessage}: ${errorMessage}`;

        super(fullErrorMessage);
    }
}
