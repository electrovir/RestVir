import {describe, itCases} from '@augment-vir/test';
import {ServiceDefinitionError} from './service-definition.error.js';

describe(ServiceDefinitionError.name, () => {
    itCases(
        (...inputs: ConstructorParameters<typeof ServiceDefinitionError>) => {
            return new ServiceDefinitionError(...inputs).message;
        },
        [
            {
                it: 'includes endpoint path',
                input: {
                    path: '/endpoint-path',
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                    endpoint: true,
                    socket: false,
                },
                expect: "Failed to define endpoint ''/endpoint-path'' on service 'service-name': failed to something",
            },
            {
                it: 'includes socket path',
                input: {
                    path: '/socket-path',
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                    socket: true,
                    endpoint: false,
                },
                expect: "Failed to define socket ''/socket-path'' on service 'service-name': failed to something",
            },
            {
                it: 'excludes empty route type',
                input: {
                    path: '/endpoint-path',
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                    socket: undefined,
                    endpoint: undefined,
                },
                expect: "Failed to define service 'service-name': failed to something",
            },
            {
                it: 'excludes an empty endpoint path',
                input: {
                    path: undefined,
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                    endpoint: true,
                    socket: false,
                },
                expect: "Failed to define service 'service-name': failed to something",
            },
        ],
    );
});
