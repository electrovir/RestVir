import {assert} from '@augment-vir/assert';
import {HttpStatus} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin, defineService} from '@rest-vir/define-service';
import {or} from 'object-shape-tester';
import {implementService} from './implement-service.js';

describe(implementService.name, () => {
    it('does not require allowedAuth', () => {
        implementService(
            defineService({
                endpoints: {
                    '/test': {
                        methods: {
                            GET: true,
                        },
                        requestDataShape: undefined,
                        responseDataShape: undefined,
                    },
                },
                requiredOrigin: AnyOrigin,
                serviceName: 'test',
                serviceOrigin: '',
            }),
            {
                context() {
                    return 'hi';
                },
            },
            {
                endpoints: {
                    '/test'() {
                        return {
                            statusCode: HttpStatus.Ok,
                            responseData: undefined,
                        };
                    },
                },
            },
        );
    });
    it('handles shape definitions', () => {
        implementService(
            defineService({
                endpoints: {
                    '/test': {
                        methods: {
                            GET: true,
                        },
                        requestDataShape: {
                            a: -1,
                            b: or(undefined, ''),
                        },
                        responseDataShape: undefined,
                    },
                },
                requiredOrigin: AnyOrigin,
                serviceName: 'test',
                serviceOrigin: '',
            }),
            {
                context() {
                    return 'hi';
                },
            },
            {
                endpoints: {
                    '/test'({requestData}) {
                        assert.tsType<typeof requestData>().equals<
                            Readonly<{
                                a: number;
                                b: string | undefined;
                            }>
                        >();

                        return {
                            statusCode: HttpStatus.Ok,
                            responseData: undefined,
                        };
                    },
                },
            },
        );
    });
    it('requires extractAuth if the definition requires it', () => {
        implementService(
            defineService({
                endpoints: {
                    '/test': {
                        methods: {
                            GET: true,
                        },
                        requestDataShape: undefined,
                        responseDataShape: undefined,
                        requiredAuth: ['a'],
                    },
                },
                requiredOrigin: AnyOrigin,
                serviceName: 'test',
                serviceOrigin: '',
                allowedAuth: [
                    'a',
                    'b',
                ],
            }),
            // @ts-expect-error: missing `extractAuth`
            {
                context() {
                    return 'hi';
                },
            },
            {
                endpoints: {
                    '/test'() {
                        return {
                            statusCode: HttpStatus.Ok,
                            responseData: undefined,
                        };
                    },
                },
            },
        );
    });
    it('blocks non-function endpoint implementations', () => {
        assert.throws(() =>
            implementService(
                defineService({
                    endpoints: {
                        '/test': {
                            methods: {
                                GET: true,
                            },
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                        },
                    },
                    requiredOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
                {
                    context() {
                        return 'hi';
                    },
                },
                {
                    endpoints: {
                        // @ts-expect-error: this is supposed to be a function
                        '/test': 'five',
                    },
                },
            ),
        );
    });
    it('blocks extra endpoint implementations', () => {
        assert.throws(() =>
            implementService(
                defineService({
                    endpoints: {
                        '/test': {
                            methods: {
                                GET: true,
                            },
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                        },
                    },
                    requiredOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
                {
                    context() {
                        return 'hi';
                    },
                },
                {
                    endpoints: {
                        '/test'() {
                            return {
                                statusCode: HttpStatus.Ok,
                                responseData: undefined,
                            };
                        },
                        // @ts-expect-error: this endpoint is not part of the definition
                        '/test2'() {
                            return {
                                statusCode: HttpStatus.Ok,
                                responseData: undefined,
                            };
                        },
                    },
                },
            ),
        );
    });
    it('does not require response data output when it is undefined', () => {
        implementService(
            defineService({
                endpoints: {
                    '/test': {
                        methods: {
                            GET: true,
                        },
                        requestDataShape: undefined,
                        responseDataShape: undefined,
                    },
                },
                requiredOrigin: AnyOrigin,
                serviceName: 'test',
                serviceOrigin: '',
            }),
            {
                context() {
                    return 'hi';
                },
            },
            {
                endpoints: {
                    '/test'() {
                        return {
                            statusCode: HttpStatus.Ok,
                        };
                    },
                },
            },
        );
    });
    it('requires response data', () => {
        implementService(
            defineService({
                endpoints: {
                    '/test': {
                        methods: {
                            GET: true,
                        },
                        requestDataShape: undefined,
                        responseDataShape: {
                            data: '',
                        },
                    },
                },
                requiredOrigin: AnyOrigin,
                serviceName: 'test',
                serviceOrigin: '',
            }),
            {
                context() {
                    return 'hi';
                },
            },
            {
                endpoints: {
                    // @ts-expect-error: missing response data
                    '/test'() {
                        return {
                            statusCode: HttpStatus.Ok,
                        };
                    },
                },
            },
        );
    });
    it('requires endpoints to be implemented', () => {
        assert.throws(() =>
            implementService(
                defineService({
                    endpoints: {
                        '/test': {
                            methods: {
                                GET: true,
                            },
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                        },
                    },
                    requiredOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
                {
                    context() {
                        return 'hi';
                    },
                },
                // @ts-expect-error: missing endpoint implementation
                {},
            ),
        );
    });
    it('requires socket to be implemented', () => {
        assert.throws(() =>
            implementService(
                defineService({
                    sockets: {
                        '/test': {
                            messageDataShape: undefined,
                        },
                    },
                    requiredOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
                {
                    context() {
                        return 'hi';
                    },
                },
                // @ts-expect-error: missing socket implementation
                {},
            ),
        );
    });
    it('implements sockets', () => {
        implementService(
            defineService({
                sockets: {
                    '/test': {
                        messageDataShape: undefined,
                    },
                },
                requiredOrigin: AnyOrigin,
                serviceName: 'test',
                serviceOrigin: '',
            }),
            {
                context() {
                    return 'hi';
                },
            },
            {
                sockets: {
                    '/test': {},
                },
            },
        );
    });
    it('rejects a non function socket listener', () => {
        assert.throws(
            () =>
                implementService(
                    defineService({
                        sockets: {
                            '/test': {
                                messageDataShape: undefined,
                            },
                        },
                        requiredOrigin: AnyOrigin,
                        serviceName: 'test',
                        serviceOrigin: '',
                    }),
                    {
                        context() {
                            return 'hi';
                        },
                    },
                    {
                        sockets: {
                            '/test': {
                                // @ts-expect-error: this should be a function
                                onClose: 'hi',
                            },
                        },
                    },
                ),
            {
                matchMessage: 'implementations are not functions for',
            },
        );
    });
    it('rejects extra socket implementations', () => {
        assert.throws(
            () =>
                implementService(
                    defineService({
                        sockets: {
                            '/test': {
                                messageDataShape: undefined,
                            },
                        },
                        requiredOrigin: AnyOrigin,
                        serviceName: 'test',
                        serviceOrigin: '',
                    }),
                    {
                        context() {
                            return 'hi';
                        },
                    },
                    {
                        sockets: {
                            '/test': {},
                            // @ts-expect-error: this is an unexpected socket path
                            '/fake': {},
                        },
                    },
                ),
            {
                matchMessage: 'implementations have extra paths',
            },
        );
    });
});
