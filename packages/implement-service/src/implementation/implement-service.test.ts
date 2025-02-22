import {assert} from '@augment-vir/assert';
import {HttpStatus} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin, defineService} from '@rest-vir/define-service';
import {or} from 'object-shape-tester';
import {implementService} from './implement-service.js';

describe(implementService.name, () => {
    it('handles shape definitions', () => {
        implementService(
            {
                createContext() {
                    return {
                        context: 'hi',
                    };
                },
                service: defineService({
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
                    requiredClientOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
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
    it('blocks non-function endpoint implementations', () => {
        assert.throws(() =>
            implementService(
                {
                    service: defineService({
                        endpoints: {
                            '/test': {
                                methods: {
                                    GET: true,
                                },
                                requestDataShape: undefined,
                                responseDataShape: undefined,
                            },
                        },
                        requiredClientOrigin: AnyOrigin,
                        serviceName: 'test',
                        serviceOrigin: '',
                    }),

                    // @ts-expect-error: the messed up `/test` implementation (which should be a function) messes up this type for some reason
                    createContext() {
                        return 'hi';
                    },
                },
                {
                    endpoints: {
                        '/test': 'hi',
                    },
                },
            ),
        );
    });
    it('blocks extra endpoint implementations', () => {
        assert.throws(() =>
            implementService(
                {
                    service: defineService({
                        endpoints: {
                            '/test': {
                                methods: {
                                    GET: true,
                                },
                                requestDataShape: undefined,
                                responseDataShape: undefined,
                            },
                        },
                        requiredClientOrigin: AnyOrigin,
                        serviceName: 'test',
                        serviceOrigin: '',
                    }),
                    createContext() {
                        return {
                            context: 'hi',
                        };
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
            {
                service: defineService({
                    endpoints: {
                        '/test': {
                            methods: {
                                GET: true,
                            },
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                        },
                    },
                    requiredClientOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
                createContext() {
                    return {
                        context: 'hi',
                    };
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
            {
                service: defineService({
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
                    requiredClientOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
                createContext() {
                    return {
                        context: 'hi',
                    };
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
                {
                    service: defineService({
                        endpoints: {
                            '/test': {
                                methods: {
                                    GET: true,
                                },
                                requestDataShape: undefined,
                                responseDataShape: undefined,
                            },
                        },
                        requiredClientOrigin: AnyOrigin,
                        serviceName: 'test',
                        serviceOrigin: '',
                    }),
                    // @ts-expect-error: for some reason the missing endpoint implementation error shows up here
                    createContext() {
                        return 'hi';
                    },
                },
                {},
            ),
        );
    });
    it('requires WebSocket to be implemented', () => {
        assert.throws(() =>
            implementService(
                {
                    service: defineService({
                        webSockets: {
                            '/test': {
                                messageFromHostShape: undefined,
                                messageFromClientShape: undefined,
                            },
                        },
                        requiredClientOrigin: AnyOrigin,
                        serviceName: 'test',
                        serviceOrigin: '',
                    }),
                    // @ts-expect-error: for some reason the missing WebSocket implementation error shows up here
                    createContext() {
                        return 'hi';
                    },
                },
                {},
            ),
        );
    });
    it('implements WebSockets', () => {
        implementService(
            {
                service: defineService({
                    webSockets: {
                        '/test': {
                            messageFromHostShape: undefined,
                            messageFromClientShape: undefined,
                        },
                    },
                    requiredClientOrigin: AnyOrigin,
                    serviceName: 'test',
                    serviceOrigin: '',
                }),
                createContext() {
                    return {
                        context: 'hi',
                    };
                },
            },
            {
                webSockets: {
                    '/test': {},
                },
            },
        );
    });
    it('rejects a non function WebSocket listener', () => {
        assert.throws(
            () =>
                implementService(
                    {
                        service: defineService({
                            webSockets: {
                                '/test': {
                                    messageFromHostShape: undefined,
                                    messageFromClientShape: undefined,
                                },
                            },
                            requiredClientOrigin: AnyOrigin,
                            serviceName: 'test',
                            serviceOrigin: '',
                        }),
                        // @ts-expect-error: the messed up `/test` implementation (which should be a function) messes up this type for some reason
                        createContext() {
                            return 'hi';
                        },
                    },
                    {
                        webSockets: {
                            '/test': {
                                close: 'hi',
                            },
                        },
                    },
                ),
            {
                matchMessage: 'implementations are not functions for',
            },
        );
    });
    it('rejects extra WebSocket implementations', () => {
        assert.throws(
            () =>
                implementService(
                    {
                        service: defineService({
                            webSockets: {
                                '/test': {
                                    messageFromHostShape: undefined,
                                    messageFromClientShape: undefined,
                                },
                            },
                            requiredClientOrigin: AnyOrigin,
                            serviceName: 'test',
                            serviceOrigin: '',
                        }),
                        createContext() {
                            return {
                                context: 'hi',
                            };
                        },
                    },
                    {
                        webSockets: {
                            '/test': {},
                            // @ts-expect-error: this is an unexpected WebSocket path
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
