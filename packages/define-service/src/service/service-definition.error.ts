import {stringify} from '@augment-vir/common';
import type {NoParam} from '../util/no-param.js';

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
        routeType,
    }: {
        serviceName: string | NoParam;
        path: string | undefined;
        errorMessage: string;
        routeType: 'endpoint' | 'socket' | undefined;
    }) {
        const serviceNameMessage = `service '${String(serviceName)}'`;

        const nameMessage =
            path && routeType
                ? `${routeType} '${stringify(path)}' on ${serviceNameMessage}`
                : serviceNameMessage;

        const fullErrorMessage = `Failed to define ${nameMessage}: ${errorMessage}`;

        super(fullErrorMessage);
    }
}
