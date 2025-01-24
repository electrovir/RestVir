import {assert} from '@augment-vir/assert';
import {
    getObjectTypedKeys,
    getObjectTypedValues,
    HttpMethod,
    type ArrayElement,
} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {AnyOrigin} from '../util/origin.js';
import {
    assertValidServiceDefinition,
    defineService,
    type ServiceDefinition,
} from './define-service.js';
import {mockService, MyMockAuth} from './define-service.mock.js';
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
            .equals<undefined | {count: number}>();
    });

    it('preserves allowed auth input', () => {
        const myService = defineService({
            allowedAuth: getObjectTypedValues(MyMockAuth),
            endpoints: {
                '/path': {
                    requestDataShape: undefined,
                    requiredAuth: [
                        MyMockAuth.Admin,
                    ],
                    requiredOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
            },
            serviceName: 'my-service',
            serviceOrigin: 'some origin',
            requiredOrigin: AnyOrigin,
        });

        assert.tsType<ArrayElement<typeof myService.allowedAuth>>().equals<MyMockAuth>();
    });
    it('required endpoint auth must be a subset of the service allowed auth', () => {
        assert.throws(
            () => {
                const myService = defineService({
                    allowedAuth: [
                        'a',
                        'b',
                        'c',
                    ],
                    endpoints: {
                        '/path': {
                            requestDataShape: undefined,
                            requiredAuth: [
                                // @ts-expect-error: not a subset of the allowed auth
                                'q',
                            ],
                            requiredOrigin: undefined,
                            responseDataShape: undefined,
                            methods: {
                                [HttpMethod.Get]: true,
                            },
                        },
                    },
                    serviceName: 'my-service',
                    serviceOrigin: 'some origin',
                    requiredOrigin: AnyOrigin,
                });

                assert
                    .tsType<ArrayElement<typeof myService.allowedAuth>>()
                    .equals<'a' | 'b' | 'c'>();
            },
            {
                matchMessage: 'Invalid required endpoint auth',
            },
        );
    });
    it('does not require allowed auth', () => {
        const myService = defineService({
            endpoints: {
                '/path': {
                    requestDataShape: undefined,
                    requiredOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
            },
            serviceName: 'my-service',
            serviceOrigin: 'some origin',
            requiredOrigin: AnyOrigin,
        });

        assert.tsType<typeof myService.allowedAuth>().equals<undefined>();
    });
    it('preserves methods', () => {
        const myService = defineService({
            allowedAuth: getObjectTypedValues(MyMockAuth),
            endpoints: {
                '/path': {
                    requestDataShape: undefined,
                    requiredAuth: [
                        MyMockAuth.Admin,
                    ],
                    requiredOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        GET: true,
                    },
                },
            },
            serviceName: 'my-service',
            serviceOrigin: 'some origin',
            requiredOrigin: AnyOrigin,
        });

        assert.tsType<(typeof myService.endpoints)['/path']['methods']>().equals<
            Readonly<{
                [HttpMethod.Get]: true;
            }>
        >();
    });
    it('preserves undefined auth input', () => {
        const myService = defineService({
            allowedAuth: undefined,
            endpoints: {
                '/path': {
                    requestDataShape: undefined,
                    requiredAuth: undefined,
                    requiredOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
                '/path2': {
                    requestDataShape: undefined,
                    requiredAuth: undefined,
                    requiredOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
            },
            serviceName: 'my-service',
            serviceOrigin: 'some origin',
            requiredOrigin: AnyOrigin,
        });

        assert.tsType(myService.allowedAuth).equals<undefined>();
    });
    it('can be assigned to an empty definition', () => {
        const myService = defineService({
            allowedAuth: undefined,
            endpoints: {
                '/path': {
                    requestDataShape: undefined,
                    requiredAuth: undefined,
                    requiredOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
                '/path2': {
                    requestDataShape: undefined,
                    requiredAuth: undefined,
                    requiredOrigin: undefined,
                    responseDataShape: undefined,
                    methods: {
                        [HttpMethod.Get]: true,
                    },
                },
            },
            serviceName: 'my-service',
            serviceOrigin: 'some origin',
            requiredOrigin: AnyOrigin,
        });

        function acceptsDefinition(input: ServiceDefinition) {}

        acceptsDefinition(myService);
    });

    it('blocks invalid endpoint paths', () => {
        assert.throws(
            () => {
                defineService({
                    serviceName: 'invalid-test-service',
                    allowedAuth: undefined,
                    serviceOrigin: '',
                    endpoints: {
                        '/valid-path': {
                            requiredAuth: undefined,
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredOrigin: undefined,
                            methods: {
                                [HttpMethod.Get]: true,
                            },
                        },
                        // @ts-expect-error: Paths must start with a "/"
                        'invalid-path': {
                            requiredAuth: undefined,
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredOrigin: undefined,
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
                    | '/requires-admin'
                    | '/returns-error-status'
                    | '/returns-response-error'
                    | '/test'
                    | '/throws-error'
                    | '/with/:param1/:param2'
                    | '/plain'
                    | '/long-running'
                    | '/function-origin'
                    | '/array-origin'
                    | '/health'
                    | '/requires-origin'
                )[]
            >();
    });

    it('errors on type access', () => {
        mockService.endpoints;

        assert.throws(() => mockService.endpoints['/empty'].RequestType);
        assert.throws(() => mockService.endpoints['/empty'].ResponseType);
    });

    it('preserves service name as a const type', () => {
        assert.tsType(mockService.serviceName).equals<'mock-service'>();
    });

    it('blocks empty authRole arrays', () => {
        assert.throws(
            () => {
                defineService({
                    serviceName: 'no-auth-roles-service',
                    allowedAuth: getObjectTypedValues(MyMockAuth),
                    serviceOrigin: '',
                    requiredOrigin: AnyOrigin,
                    endpoints: {
                        '/no-auth-roles': {
                            // @ts-expect-error: empty requiredAuth is not allowed
                            requiredAuth: [],
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredOrigin: undefined,
                        },
                    },
                });
            },
            {
                matchConstructor: ServiceDefinitionError,
            },
        );
    });

    it('blocks empty service name', () => {
        assert.throws(
            () => {
                defineService({
                    // @ts-expect-error: service name cannot be an empty string
                    serviceName: '',
                    allowedAuth: undefined,
                    serviceOrigin: '',
                    endpoints: {},
                    requiredOrigin: AnyOrigin,
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
                    allowedAuth: undefined,
                    serviceOrigin: '',
                    endpoints: {},
                    requiredOrigin: AnyOrigin,
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
                    allowedAuth: undefined,
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
            allowedAuth: undefined,
            requiredOrigin: AnyOrigin,
            serviceOrigin: '',
            endpoints: {
                '/test-endpoint': {
                    requiredAuth: undefined,
                    requestDataShape: undefined,
                    responseDataShape: undefined,
                    requiredOrigin: undefined,
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
            allowedAuth: undefined,
            requiredOrigin: AnyOrigin,
            serviceOrigin: '',
            endpoints: {
                '/test-endpoint': {
                    requiredAuth: undefined,
                    requestDataShape: undefined,
                    responseDataShape: undefined,
                    requiredOrigin: undefined,
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
                    allowedAuth: undefined,
                    serviceOrigin: '',
                    requiredOrigin: AnyOrigin,
                    endpoints: {
                        '/test-endpoint': {
                            requiredAuth: undefined,
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredOrigin: undefined,
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
                    allowedAuth: undefined,
                    requiredOrigin: AnyOrigin,
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
                    allowedAuth: undefined,
                    requiredOrigin: AnyOrigin,
                    serviceOrigin: '',
                    endpoints: {
                        '/test-endpoint/': {
                            requiredAuth: undefined,
                            requestDataShape: undefined,
                            responseDataShape: undefined,
                            requiredOrigin: undefined,
                            methods: {
                                [HttpMethod.Get]: true,
                            },
                        },
                    },
                }),
            {
                matchMessage: 'Endpoint path cannot end with /',
            },
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
                allowedAuth: undefined,
                requiredOrigin: AnyOrigin,
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
                allowedAuth: undefined,
                requiredOrigin: AnyOrigin,
                init: {
                    endpoints: {},
                    allowedAuth: undefined,
                    serviceName: 'test-service',
                    serviceOrigin: '',
                    requiredOrigin: AnyOrigin,
                },
            },
            throws: undefined,
        },
        {
            it: 'rejects an endpoint with an invalid path',
            input: {
                serviceName: 'test-service',
                serviceOrigin: '',
                allowedAuth: undefined,
                requiredOrigin: AnyOrigin,
                init: {
                    endpoints: {},
                    allowedAuth: undefined,
                    serviceName: 'test-service',
                    serviceOrigin: '',
                    requiredOrigin: AnyOrigin,
                },
                endpoints: {
                    // @ts-expect-error: endpoint path is not valid (must start with a slash
                    'bad-path': {
                        requiredAuth: undefined,
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
                        requiredAuth: undefined,
                        requiredOrigin: '',
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
                allowedAuth: undefined,
                init: {
                    serviceName: 'test-service',
                    serviceOrigin: '',
                    allowedAuth: undefined,
                    endpoints: {},
                    requiredOrigin: AnyOrigin,
                },
                requiredOrigin: AnyOrigin,
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
                allowedAuth: undefined,
            },
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
    ]);
});
