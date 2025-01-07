import {assert} from '@augment-vir/assert';
import {HttpStatus} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin, defineService} from '@rest-vir/define-service';
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
                '/test'() {
                    return {
                        statusCode: HttpStatus.Ok,
                        responseData: undefined,
                    };
                },
            },
            {
                context() {
                    return 'hi';
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
            {
                '/test'() {
                    return {
                        statusCode: HttpStatus.Ok,
                        responseData: undefined,
                    };
                },
            },
            // @ts-expect-error: missing `extractAuth`
            {
                context() {
                    return 'hi';
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
                    // @ts-expect-error: this is supposed to be a function
                    '/test': 'five',
                },
                {
                    context() {
                        return 'hi';
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
                {
                    context() {
                        return 'hi';
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
                '/test'() {
                    return {
                        statusCode: HttpStatus.Ok,
                    };
                },
            },
            {
                context() {
                    return 'hi';
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
                // @ts-expect-error: missing endpoint implementation
                {},
                {
                    context() {
                        return 'hi';
                    },
                },
            ),
        );
    });
});
