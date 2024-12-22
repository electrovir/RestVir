import {getEnumValues} from '@augment-vir/common';
import {defineService} from '../define-service.js';

export enum MyAuth {
    Admin = 'admin',
    Manager = 'manager',
    User = 'user',
}

export const myService = defineService({
    serviceName: 'my-service',
    allowedAuth: getEnumValues(MyAuth),
    /**
     * The origin at which the service will be hosted. Client requests sent to this service will be
     * sent to this origin.
     */
    serviceOrigin: 'https://example.com',
    endpoints: {
        '/my-endpoint': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredAuth: [MyAuth.Admin],
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
            requiredAuth: [
                MyAuth.Admin,
                MyAuth.Manager,
            ],
            methods: {
                GET: true,
            },
            requiredClientOrigin: 'https://my-website.com',
        },
    },
});
