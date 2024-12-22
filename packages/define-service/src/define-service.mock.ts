import {getEnumValues} from '@augment-vir/common';
import {or} from 'object-shape-tester';
import {defineService} from './define-service.js';
import {HttpMethod} from './http-method.js';

export enum MyAuth {
    Admin = 'admin',
    Manager = 'manager',
    User = 'user',
}

const websiteOrigin = 'https://example.com';

export const mockService = defineService({
    serviceName: 'mock-service',
    allowedAuth: getEnumValues(MyAuth),
    serviceOrigin: 'https://example.com',
    endpoints: {
        '/test': {
            requiredAuth: [MyAuth.Admin],
            requestDataShape: {
                somethingHere: '',
                testValue: 5,
            },
            methods: {
                [HttpMethod.Get]: true,
            },
            responseDataShape: {
                result: or({hello: 'there'}, 5),
                requestData: {
                    somethingHere: '',
                    testValue: 5,
                },
            },
            requiredClientOrigin: undefined,
        },
        '/with/:param1/:param2': {
            methods: {
                [HttpMethod.Head]: true,
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            requiredAuth: undefined,
            requiredClientOrigin: undefined,
            responseDataShape: undefined,
        },
        '/empty': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        '/requires-admin': {
            requiredAuth: [MyAuth.Admin],
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        '/missing': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: websiteOrigin,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Throws an error. */
        '/throws-error': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Returns an error status code with an error response message. */
        '/returns-response-error': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Returns an error status code without an error response message. */
        '/returns-error-status': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: websiteOrigin,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
    },
});
