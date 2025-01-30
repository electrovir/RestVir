import {AnyOrigin, defineService} from '../index.js';

export const myService = defineService({
    serviceName: 'my-service',
    /**
     * The origin at which the service will be hosted. Client requests sent to this service will be
     * sent to this origin.
     */
    serviceOrigin: 'https://example.com',
    requiredOrigin: AnyOrigin,
    endpoints: {
        '/my-endpoint': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: undefined,
            methods: {
                GET: true,
            },
        },
        '/my-endpoint/:user-id': {
            requestDataShape: undefined,
            responseDataShape: {
                username: '',
                firstName: '',
                lastName: '',
            },
            methods: {
                GET: true,
            },
            requiredOrigin: 'https://my-website.com',
        },
    },
});
