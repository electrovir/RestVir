import {describe, itCases} from '@augment-vir/test';
import {createRestVirHandlerErrorPrefix} from './handler.error.js';

describe(createRestVirHandlerErrorPrefix.name, () => {
    itCases(createRestVirHandlerErrorPrefix, [
        {
            it: 'creates an endpoint prefix string',
            input: {
                path: '/path',
                service: {
                    serviceName: 'test service',
                },
                isEndpoint: true,
                isWebSocket: false,
            },
            expect: "Endpoint '/path' failed in service 'test service'",
        },
        {
            it: 'creates a WebSocket prefix string',
            input: {
                path: '/path',
                service: {
                    serviceName: 'test service',
                },
                isEndpoint: false,
                isWebSocket: true,
            },
            expect: "WebSocket '/path' failed in service 'test service'",
        },
        {
            it: 'creates a plain prefix string',
            input: {
                path: '/path',
                service: {
                    serviceName: 'test service',
                },
                isEndpoint: false,
                isWebSocket: false,
            },
            expect: "'/path' failed in service 'test service'",
        },
    ]);
});
