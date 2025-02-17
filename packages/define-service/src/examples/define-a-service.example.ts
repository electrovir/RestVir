import {AnyOrigin, defineService} from '../index.js';

export const myService = await defineService({
    serviceName: 'my-service',
    /**
     * The origin at which the service will be hosted. Client requests sent to this service will be
     * sent to this origin. In dev, use a `isDev` check to switch between your production origin and
     * `localhost`.
     */
    serviceOrigin: 'https://example.com',
    requiredClientOrigin: AnyOrigin,
    endpoints: {
        '/my-endpoint': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: undefined,
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
            requiredClientOrigin: 'https://my-website.com',
        },
    },
});
