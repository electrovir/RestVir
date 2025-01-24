import {describe, itCases} from '@augment-vir/test';
import {createEndpointErrorPrefix} from './endpoint.error.js';

describe(createEndpointErrorPrefix.name, () => {
    itCases(createEndpointErrorPrefix, [
        {
            it: 'creates a prefix string',
            input: {
                endpointPath: '/path',
                service: {
                    serviceName: 'test service',
                },
            },
            expect: "Endpoint '/path' failed in service 'test service'",
        },
    ]);
});
