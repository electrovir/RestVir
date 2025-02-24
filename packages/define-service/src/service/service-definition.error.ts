import {ensureErrorClass, extractErrorMessage} from '@augment-vir/common';
import {type NoParam} from '../util/no-param.js';

/**
 * Parameters for {@link ServiceDefinitionError}
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ServiceDefinitionErrorParams = {
    serviceName: string | NoParam;
    errorMessage: string;

    path: string | undefined;
    isWebSocket: boolean | undefined;
    isEndpoint: boolean | undefined;
};

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
        path,
        errorMessage,
        isEndpoint,
        isWebSocket,
    }: ServiceDefinitionErrorParams) {
        const serviceNameMessage = `Service '${String(serviceName)}'`;

        const routeType = isEndpoint ? 'Endpoint' : isWebSocket ? 'WebSocket' : undefined;

        const nameMessage =
            path && routeType
                ? `${routeType} '${path}' on ${serviceNameMessage}`
                : serviceNameMessage;

        const fullErrorMessage = `Failed to define ${nameMessage}: ${errorMessage}`;

        super(fullErrorMessage);
    }
}

/**
 * Ensures that the given error is a {@link ServiceDefinitionError} instance. If it's not, then a new
 * {@link ServiceDefinitionError} is created with the given params.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function ensureServiceDefinitionError(
    error: unknown,
    params: Omit<ServiceDefinitionErrorParams, 'errorMessage'>,
) {
    return ensureErrorClass(error, ServiceDefinitionError, {
        ...params,
        errorMessage: extractErrorMessage(error),
    });
}
