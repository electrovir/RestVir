import {assert} from '@augment-vir/assert';
import {getObjectTypedKeys, HttpMethod} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {assertValidShape, exact, or} from 'object-shape-tester';
import {type RequireAtLeastOne} from 'type-fest';
import {type EndpointPathBase} from '../endpoint/endpoint-path.js';
import {AnyOrigin} from '../util/origin.js';
import {
    assertValidServiceDefinition,
    defineService,
    type ServiceDefinition,
} from './define-service.js';
import {mockService} from './define-service.mock.js';
import {matchUrlToService} from './match-url.js';
import {ServiceDefinitionError} from './service-definition.error.js';

describe(defineService.name, () => {
    it('allows wrapping an existing service', () => {
        const myService = defineService({
            ...mockService.init,
            serviceOrigin: 'https://electrovir.com',
        });

        assert.strictEquals(mockService.serviceOrigin, 'https://example.com');
        assert.strictEquals(myService.serviceOrigin, 'https://electrovir.com');
    });
    it('allows possibly undefined endpoint message types', () => {
        assert
            .tsType<(typeof mockService.endpoints)['/long-running']['RequestType']>()
            .equals<undefined | Readonly<{count: number}>>();
    });
    it('preserves WebSocket protocols', () => {
        assert
            .tsType<(typeof mockService.webSockets)['/required-protocols']['ProtocolsType']>()
            .equals<[string, string, 'hi']>();
    });
    it('defaults WebSocket protocols', () => {
        assert
            .tsType<(typeof mockService.webSockets)['/no-client-data']['ProtocolsType']>()
            .equals<string[]>();
    });
    it('finds a matching endpoint path', () => {
        const result = matchUrlToService(mockService, '/with/one/two');

        assert.tsType(result).equals<
            | undefined
            | RequireAtLeastOne<{
                  webSocketPath: keyof typeof mockService.webSockets;
                  endpointPath: keyof typeof mockService.endpoints;
              }>
        >();

        assert.deepEquals(result, {
            endpointPath: mockService.endpoints['/with/:param1/:param2'].path,
        });
    });
    it('finds a matching WebSocket path', () => {
        const result = matchUrlToService(mockService, '/no-origin');

        assert.tsType(result).equals<
            | undefined
            | RequireAtLeastOne<{
                  webSocketPath: keyof typeof mockService.webSockets;
                  endpointPath: keyof typeof mockService.endpoints;
              }>
        >();

        assert.deepEquals(result, {
            webSocketPath: mockService.webSockets['/no-origin'].path,
        });
    });
    it('finds a matching full WebSocket url', () => {
        const result = matchUrlToService(mockService, 'http://example.com/no-origin');

        assert.deepEquals(result, {
            webSocketPath: mockService.webSockets['/no-origin'].path,
        });
    });
    it('finds no matching paths', () => {
        const result = matchUrlToService(mockService, '/this-does-not-exist');

        assert.isUndefined(result);
    });
    it('preserves methods', () => {
        const myService = defineService({
            endpoints: {
                '/path': {
                    requestDataShape: undefined,
                    requiredClientOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        GET: true,
                    },
                },
            },
            serviceName: 'my-service',
            serviceOrigin: 'some origin',
            requiredClientOrigin: AnyOrigin,
        });

        assert.tsType<(typeof myService.endpoints)['/path']['methods']>().equals<{
            [HttpMethod.Get]: true;
        }>();
    });
    it('can be assigned to an empty definition', () => {
        const myService = defineService({
            endpoints: {
                '/path': {
                    requestDataShape: undefined,
                    requiredClientOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
                '/path2': {
                    requestDataShape: undefined,
                    requiredClientOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
            },
            serviceName: 'my-service',
            serviceOrigin: 'some origin',
            requiredClientOrigin: AnyOrigin,
        });

        function acceptsDefinition(input: ServiceDefinition) {}

        acceptsDefinition(myService);
    });

    it('blocks invalid endpoint paths', () => {
        assert.throws(
            () => {
                defineService({
                    serviceName: 'invalid-test-service',
                    serviceOrigin: '',
                    endpoints: {
                        '/valid-path': {
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredClientOrigin: undefined,
                            methods: {
                                [HttpMethod.Get]: true,
                            },
                        },
                        // @ts-expect-error: Paths must start with a "/"
                        'invalid-path': {
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredClientOrigin: undefined,
                            methods: {
                                [HttpMethod.Get]: true,
                            },
                        },
                    },
                });
            },
            {
                matchConstructor: ServiceDefinitionError,
            },
        );
    });
    it('keeps endpoint paths', () => {
        const endpointPaths = getObjectTypedKeys(mockService.endpoints);
        assert
            .tsType(endpointPaths)
            .equals<
                (
                    | '/empty'
                    | '/missing'
                    | '/incorrectly-has-response-data'
                    | '/requires-admin'
                    | '/returns-error-status'
                    | '/returns-response-error'
                    | '/test'
                    | '/throws-error'
                    | '/with/:param1/:param2'
                    | '/plain'
                    | '/long-running'
                    | '/function-origin'
                    | '/custom-props'
                    | '/array-origin'
                    | '/health'
                    | '/requires-origin'
                )[]
            >();
    });

    it('preserves custom props', () => {
        assert.tsType(mockService.endpoints['/custom-props'].customProps).equals<{
            somethingElse: string;
        }>();
    });

    it('errors on type access', () => {
        mockService.endpoints;

        assert.throws(() => mockService.endpoints['/empty'].RequestType);
        assert.throws(() => mockService.endpoints['/empty'].ResponseType);
    });

    it('preserves service name as a const type', () => {
        assert.tsType(mockService.serviceName).equals<'mock-service'>();
    });

    it('blocks empty service name', () => {
        assert.throws(
            () => {
                defineService({
                    // @ts-expect-error: service name cannot be an empty string
                    serviceName: '',
                    serviceOrigin: '',
                    endpoints: {},
                    requiredClientOrigin: AnyOrigin,
                });
            },
            {
                matchConstructor: ServiceDefinitionError,
            },
        );
    });

    it('blocks non-string service name', () => {
        assert.throws(
            () => {
                defineService({
                    // @ts-expect-error: intentionally the wrong type for testing purposes
                    serviceName: 54,
                    serviceOrigin: '',
                    endpoints: {},
                    requiredClientOrigin: AnyOrigin,
                });
            },
            {
                matchConstructor: ServiceDefinitionError,
            },
        );
    });

    it('preserves endpoint output type', () => {
        assert
            .tsType<{
                request: (typeof mockService.endpoints)['/test']['RequestType'];
                response: (typeof mockService.endpoints)['/test']['ResponseType'];
            }>()
            .equals<{
                request: Readonly<{
                    somethingHere: string;
                    testValue: number;
                }>;
                response: Readonly<{
                    result:
                        | number
                        | Readonly<{
                              hello: string;
                          }>;
                    requestData: Readonly<{
                        somethingHere: string;
                        testValue: number;
                    }>;
                }>;
            }>();

        assert
            .tsType<(typeof mockService.endpoints)['/empty']['ResponseType']>()
            .equals<undefined>();
    });

    it('blocks empty object endpoints', () => {
        assert.throws(
            () => {
                defineService({
                    serviceName: 'empty-object-endpoint-service',
                    serviceOrigin: '',
                    endpoints: {
                        // @ts-expect-error: endpoint definition object cannot be empty
                        '/empty-object': {},
                    },
                });
            },
            {
                matchConstructor: ServiceDefinitionError,
            },
        );
    });

    it('requires errorMessage when returning an error-based status code', () => {
        defineService({
            serviceName: 'test-endpoint-service',
            requiredClientOrigin: AnyOrigin,
            serviceOrigin: '',
            endpoints: {
                '/test-endpoint': {
                    requestDataShape: undefined,
                    responseDataShape: undefined,
                    requiredClientOrigin: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
            },
        });
    });

    it('requires data when returning a successful status code', () => {
        defineService({
            serviceName: 'test-endpoint-service',
            requiredClientOrigin: AnyOrigin,
            serviceOrigin: '',
            endpoints: {
                '/test-endpoint': {
                    requestDataShape: undefined,
                    responseDataShape: undefined,
                    requiredClientOrigin: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
            },
        });
    });

    it('rejects missing methods', () => {
        assert.throws(
            () =>
                defineService({
                    serviceName: 'test-endpoint-service',
                    serviceOrigin: '',
                    requiredClientOrigin: AnyOrigin,
                    endpoints: {
                        '/test-endpoint': {
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredClientOrigin: undefined,
                            // @ts-expect-error: needs at least once method
                            methods: {},
                        },
                    },
                }),
            {
                matchMessage: 'Endpoint has no allowed HTTP methods',
            },
        );
    });
    it('rejects a string endpoint', () => {
        assert.throws(
            () =>
                defineService({
                    serviceName: 'test-service',
                    requiredClientOrigin: AnyOrigin,
                    serviceOrigin: '',
                    endpoints: {
                        // @ts-expect-error: invalid endpoint
                        '/derp': 'fake endpoint',
                    },
                }),
            {
                matchConstructor: ServiceDefinitionError,
            },
        );
    });

    it('rejects endpoint ending in slash', () => {
        assert.throws(
            () =>
                defineService({
                    serviceName: 'test-endpoint-service',
                    requiredClientOrigin: AnyOrigin,
                    serviceOrigin: '',
                    endpoints: {
                        '/test-endpoint/': {
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredClientOrigin: undefined,
                            methods: {
                                [HttpMethod.Get]: true,
                            },
                        },
                    },
                }),
            {
                matchMessage: 'Path cannot end with /',
            },
        );
    });
    it('can define WebSockets without endpoints', () => {
        const service = defineService({
            serviceName: 'test-endpoint-service',
            requiredClientOrigin: AnyOrigin,
            serviceOrigin: '',
            webSockets: {
                '/my-web-socket': {
                    messageFromHostShape: undefined,
                    messageFromClientShape: or(
                        {
                            code: exact(1),
                        },
                        {
                            code: exact(2),
                        },
                    ),
                    requiredClientOrigin: 'http://example.com',
                },
            },
        });

        assert.throws(
            () => service.webSockets['/my-web-socket'].MessageFromClientType,
            {
                matchMessage: 'should not be used as a value',
            },
            'Should not be able to access webSocket.MessageFromClientType',
        );
        assert.throws(
            () => service.webSockets['/my-web-socket'].MessageFromHostType,
            {
                matchMessage: 'should not be used as a value',
            },
            'Should not be able to access webSocket.MessageFromHostType',
        );
        assert.throws(
            () => service.webSockets['/my-web-socket'].ProtocolsType,
            {
                matchMessage: 'should not be used as a value',
            },
            'Should not be able to access webSocket.ProtocolsType',
        );

        assertValidShape(
            {
                code: 1,
            },
            service.webSockets['/my-web-socket'].messageFromClientShape,
        );
        assert.throws(() =>
            assertValidShape(
                {
                    code: 3,
                },
                service.webSockets['/my-web-socket'].messageFromClientShape,
            ),
        );

        assert
            .tsType<(typeof service.webSockets)['/my-web-socket']['MessageFromClientType']>()
            .equals<
                Readonly<
                    | {
                          code: 1;
                      }
                    | {
                          code: 2;
                      }
                >
            >();
    });
    it('can define no webSockets or endpoints', () => {
        const service = defineService({
            serviceName: 'test-endpoint-service',
            requiredClientOrigin: AnyOrigin,
            serviceOrigin: '',
        });

        assert.tsType<keyof typeof service.endpoints>().equals<EndpointPathBase>();
        assert.tsType<keyof typeof service.webSockets>().equals<EndpointPathBase>();
    });
    it('rejects a WebSocket with an invalid path', () => {
        assert.throws(() =>
            defineService({
                serviceName: 'test-endpoint-service',
                requiredClientOrigin: AnyOrigin,
                serviceOrigin: '',
                webSockets: {
                    '/invalid/': {
                        messageFromHostShape: undefined,
                        messageFromClientShape: {},
                    },
                },
            }),
        );
    });
});

describe(assertValidServiceDefinition.name, () => {
    const endpointSymbol = Symbol('bad path');

    itCases(assertValidServiceDefinition, [
        {
            it: 'allows a service with no endpoints',
            input: defineService({
                serviceName: 'test-service',
                requiredClientOrigin: AnyOrigin,
                serviceOrigin: '',
                endpoints: {},
            }),
            throws: undefined,
        },
        {
            it: 'allows a raw object service definition',
            input: {
                endpoints: {},
                serviceName: 'test-service',
                serviceOrigin: '',
                webSockets: {},
                requiredClientOrigin: AnyOrigin,
                init: {
                    webSockets: {},
                    endpoints: {},
                    serviceName: 'test-service',
                    serviceOrigin: '',
                    requiredClientOrigin: AnyOrigin,
                },
            },
            throws: undefined,
        },
        {
            it: 'rejects an endpoint with an invalid path',
            input: {
                serviceName: 'test-service',
                serviceOrigin: '',
                requiredClientOrigin: AnyOrigin,
                init: {
                    webSockets: {},
                    endpoints: {},
                    serviceName: 'test-service',
                    serviceOrigin: '',
                    requiredClientOrigin: AnyOrigin,
                },
                endpoints: {
                    // @ts-expect-error: endpoint path is not valid (must start with a slash
                    'bad-path': {
                        requestDataShape: undefined,
                        responseDataShape: undefined,
                        endpointPath: 'bad-path',
                        service: {
                            serviceName: 'test-service',
                            serviceOrigin: '',
                        },
                    },
                },
            },
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
        {
            it: 'rejects a symbol endpoint',
            input: {
                endpoints: {
                    // @ts-expect-error: endpoint path must be a string
                    [endpointSymbol]: {
                        requiredClientOrigin: '',
                        requestDataShape: undefined,
                        responseDataShape: undefined,
                        RequestType: undefined,
                        ResponseType: undefined,
                        service: {
                            serviceName: 'test-service',
                            serviceOrigin: '',
                        },
                    },
                },
                serviceName: 'test-service',
                serviceOrigin: '',
                init: {
                    webSockets: {},
                    serviceName: 'test-service',
                    serviceOrigin: '',
                    endpoints: {},
                    requiredClientOrigin: AnyOrigin,
                },
                requiredClientOrigin: AnyOrigin,
            },
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
        {
            it: 'rejects an invalid endpoint config',
            input: {
                endpoints: {
                    // @ts-expect-error: intentionally invalid config
                    '/my-endpoint': 'ERROR: endpoint must start with a slash',
                },
                serviceName: 'test-service',
                serviceOrigin: '',
            },
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
    ]);
});
