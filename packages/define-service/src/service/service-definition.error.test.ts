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
                    isEndpoint: true,
                    isWebSocket: false,
                },
                expect: "Failed to define Endpoint '/endpoint-path' on Service 'service-name': failed to something",
            },
            {
                it: 'includes WebSocket path',
                input: {
                    path: '/socket-path',
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                    isWebSocket: true,
                    isEndpoint: false,
                },
                expect: "Failed to define WebSocket '/socket-path' on Service 'service-name': failed to something",
            },
            {
                it: 'excludes empty route type',
                input: {
                    path: '/endpoint-path',
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                    isWebSocket: undefined,
                    isEndpoint: undefined,
                },
                expect: "Failed to define Service 'service-name': failed to something",
            },
            {
                it: 'excludes an empty endpoint path',
                input: {
                    path: undefined,
                    serviceName: 'service-name',
                    errorMessage: 'failed to something',
                    isEndpoint: true,
                    isWebSocket: false,
                },
                expect: "Failed to define Service 'service-name': failed to something",
            },
        ],
    );
});
