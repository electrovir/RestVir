import {getEnumValues} from '@augment-vir/common';
import {AnyOrigin, defineService} from '../index.js';

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
    requiredOrigin: AnyOrigin,
    endpoints: {
        '/my-endpoint': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredAuth: [MyAuth.Admin],
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
            requiredAuth: [
                MyAuth.Admin,
                MyAuth.Manager,
            ],
            methods: {
                GET: true,
            },
            requiredOrigin: 'https://my-website.com',
        },
    },
});
