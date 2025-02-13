/* node:coverage disable */
/** This is just a mock file. */

import {HttpMethod, wait} from '@augment-vir/common';
import {exact, or} from 'object-shape-tester';
import {AnyOrigin} from '../util/origin.js';
import {defineService} from './define-service.js';

export const mockWebsiteOrigin = 'https://example.com';

export const mockService = defineService({
    serviceName: 'mock-service',
    serviceOrigin: 'https://example.com',
    requiredClientOrigin: AnyOrigin,
    sockets: {
        '/origin-locked': {
            messageFromServerShape: exact('ok'),
            messageFromClientShape: {
                a: '',
                b: -1,
            },
            requiredClientOrigin: mockWebsiteOrigin,
        },
        '/no-origin': {
            messageFromServerShape: exact('ok'),
            messageFromClientShape: {
                a: '',
                b: -1,
            },
        },
        '/no-client-data': {
            messageFromServerShape: exact('ok'),
            messageFromClientShape: undefined,
        },
        '/no-server-data': {
            messageFromServerShape: undefined,
            messageFromClientShape: undefined,
        },
        '/sends-protocol': {
            messageFromClientShape: undefined,
            messageFromServerShape: [''],
        },
        '/custom-props-web-socket': {
            messageFromServerShape: exact('ok'),
            messageFromClientShape: undefined,
            customProps: {
                hello: '',
            },
        },
        '/with-all-listeners': {
            messageFromServerShape: exact('ok'),
            messageFromClientShape: undefined,
        },
    },
    endpoints: {
        '/custom-props': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: undefined,
            customProps: {
                somethingElse: 'hi',
            },
        },
        '/function-origin': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: undefined,
            async requiredClientOrigin(origin) {
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
            requiredClientOrigin: [
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
            requiredClientOrigin: mockWebsiteOrigin,
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
        '/incorrectly-has-response-data': {
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
            requiredClientOrigin: mockWebsiteOrigin,
            methods: {
                [HttpMethod.Get]: true,
            },
        },
    },
});
