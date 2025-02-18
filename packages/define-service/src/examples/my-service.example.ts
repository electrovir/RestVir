import {AnyOrigin, defineService, HttpMethod} from '../index.js';

export const myService = defineService({
    /** The name of your service. This will be visible to all consumers of this service definition. */
    serviceName: 'my-service',
    /**
     * The origin at which the service will be hosted. Fetch requests and WebSocket connections will
     * be sent to this service will be sent to this origin.
     *
     * It is recommended to use a ternary to switch between dev and prod origins.
     */
    serviceOrigin: isDev ? 'http://localhost:3000' : 'https://example.com',
    /**
     * The service's `origin` requirement for all endpoint requests and WebSocket connections. This
     * is used for CORS handshakes.
     *
     * This can be a string, a RegExp, a function, or an array of any of those. (If this is an
     * array, the first matching array element will be used.)
     *
     * Set this to `AnyOrigin` (imported from `'@rest-vir/define-service'`) to allow any origins.
     * Make sure that you're okay with the security impact this may have on your users of doing so.
     */
    requiredClientOrigin: AnyOrigin,
    endpoints: {
        '/my-endpoint': {
            /** This endpoint requires all requests to contain a string body. */
            requestDataShape: '',
            /** This endpoint's response body will always be empty. */
            responseDataShape: undefined,

            methods: {
                [HttpMethod.Post]: true,
            },
        },
        /** Express-style path params are allowed. */
        '/my-endpoint/:user-id': {
            /** This endpoint expects no request body data. */
            requestDataShape: undefined,
            /**
             * This endpoint will always response with data that matches:
             *
             *     {
             *         username: string,
             *         firstName: string,
             *         lastName: string
             *     }
             */
            responseDataShape: {
                username: '',
                firstName: '',
                lastName: '',
            },
            methods: {
                [HttpMethod.Get]: true,
            },
            /** Each endpoint may override the service's origin requirement. */
            requiredClientOrigin: 'https://example.com',
        },
    },
    webSockets: {
        '/my-web-socket': {
            /** This WebSocket requires all messages from the client to be a string. */
            messageFromClientShape: '',
            /** Same for messages from the host. */
            messageFromHostShape: '',
        },
    },
});
