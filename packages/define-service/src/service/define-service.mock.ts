/* node:coverage disable */
/** This is just a mock file. */

import {HttpMethod, wait} from '@augment-vir/common';
import {or} from 'object-shape-tester';
import {AnyOrigin} from '../util/origin.js';
import {defineService} from './define-service.js';

export const mockWebsiteOrigin = 'https://example.com';

export const mockService = defineService({
    serviceName: 'mock-service',
    serviceOrigin: 'https://example.com',
    requiredOrigin: AnyOrigin,
    sockets: {
        '/origin-locked': {
            messageDataShape: {
                a: '',
                b: -1,
            },
            requiredOrigin: mockWebsiteOrigin,
        },
        '/no-origin': {
            messageDataShape: {
                a: '',
                b: -1,
            },
        },
        '/no-data': {
            messageDataShape: undefined,
        },
    },
    endpoints: {
        '/function-origin': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: undefined,
            async requiredOrigin(origin) {
                await wait({milliseconds: 1});
                return !!origin?.includes('example.com');
            },
        },
        '/array-origin': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: [
                'http://example.com',
                /example\.com/,
                (origin) => {
                    return !!origin?.includes('electrovir');
                },
            ],
        },
        '/health': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: undefined,
        },
        '/test': {
            requestDataShape: {
                somethingHere: '',
                testValue: 5,
            },
            methods: {
                [HttpMethod.Post]: true,
            },
            responseDataShape: {
                result: or({hello: 'there'}, 5),
                requestData: {
                    somethingHere: '',
                    testValue: 5,
                },
            },
        },
        '/plain': {
            requestDataShape: undefined,
            methods: {
                [HttpMethod.Get]: true,
                [HttpMethod.Post]: true,
            },
            responseDataShape: {
                fakeData: '',
            },
        },
        '/requires-origin': {
            requestDataShape: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
            responseDataShape: undefined,
            requiredOrigin: mockWebsiteOrigin,
        },
        '/long-running': {
            requestDataShape: or(undefined, {count: -1}),
            methods: {
                [HttpMethod.Get]: true,
            },
            responseDataShape: {
                result: -1,
            },
        },
        '/with/:param1/:param2': {
            methods: {
                [HttpMethod.Head]: true,
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: undefined,
        },
        '/empty': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        '/requires-admin': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** This endpoint is missing its implementation in the mock service implementation. */
        '/missing': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Throws an error. */
        '/throws-error': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Returns an error status code with an error response message. */
        '/returns-response-error': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
        /** Returns an error status code without an error response message. */
        '/returns-error-status': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: mockWebsiteOrigin,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
    },
});
