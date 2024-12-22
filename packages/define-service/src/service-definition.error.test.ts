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
                    endpointPath: '/endpoint-path',
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                },
                expect: "Failed to define endpoint ''/endpoint-path'' on service 'service-name': failed to something",
            },
            {
                it: 'excludes an empty endpoint path',
                input: {
                    endpointPath: undefined,
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                },
                expect: "Failed to define service 'service-name': failed to something",
            },
        ],
    );
});
