import {getEnumValues} from '@augment-vir/common';
import {or} from 'object-shape-tester';
import {HttpMethod} from '../util/http-method.js';
import {AnyOrigin} from '../util/origin.js';
import {defineService} from './define-service.js';

export enum MyMockAuth {
    Admin = 'admin',
    Manager = 'manager',
    User = 'user',
}

const websiteOrigin = 'https://example.com';

export const mockService = defineService({
    serviceName: 'mock-service',
    allowedAuth: getEnumValues(MyMockAuth),
    serviceOrigin: 'https://example.com',
    requiredOrigin: AnyOrigin,
    endpoints: {
        '/test': {
            requiredAuth: [MyMockAuth.Admin],
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
            requiredOrigin: undefined,
        },
        '/with/:param1/:param2': {
            methods: {
                [HttpMethod.Head]: true,
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            requiredAuth: undefined,
            requiredOrigin: undefined,
            responseDataShape: undefined,
        },
        '/empty': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        '/requires-admin': {
            requiredAuth: [MyMockAuth.Admin],
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        '/missing': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: websiteOrigin,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Throws an error. */
        '/throws-error': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Returns an error status code with an error response message. */
        '/returns-response-error': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Returns an error status code without an error response message. */
        '/returns-error-status': {
            requiredAuth: undefined,
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: websiteOrigin,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
    },
});
