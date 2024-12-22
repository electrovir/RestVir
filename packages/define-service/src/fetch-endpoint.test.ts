import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {mockService} from './define-service.mock.js';
import {Endpoint} from './endpoint.js';
import {
    buildEndpointUrl,
    fetchEndpoint,
    FetchEndpointParameters,
    GenericFetchEndpointParams,
} from './fetch-endpoint.js';
import {HttpMethod} from './http-method.js';
import {createMockResponse} from './mock-response.js';
import type {NoParam} from './no-param.js';

type FetchOptions = NonNullable<GenericFetchEndpointParams['options']>;

describe(buildEndpointUrl.name, () => {
    itCases(buildEndpointUrl, [
        {
            it: 'handles a path without params',
            inputs: [
                {
                    endpointPath: '/hi',
                    service: {
                        serviceOrigin: 'http://example.com',
                        serviceName: 'test',
                    },
                },
                undefined,
            ],
            expect: 'http://example.com/hi',
        },
        {
            it: 'rejects path params when the endpoint has none',
            inputs: [
                {
                    endpointPath: '/hi',
                    service: {
                        serviceOrigin: 'http://example.com',
                        serviceName: 'test',
                    },
                },
                {},
            ],
            throws: {
                matchMessage: 'does not allow any path params',
            },
        },
        {
            it: 'handles params',
            inputs: [
                {
                    endpointPath: '/hi/:param1/:param2',
                    service: {
                        serviceOrigin: 'http://example.com',
                        serviceName: 'test',
                    },
                },
                {
                    param1: 'bye',
                    param2: 'last',
                },
            ],
            expect: 'http://example.com/hi/bye/last',
        },
        {
            it: 'rejects a missing param',
            inputs: [
                {
                    endpointPath: '/hi/:param1/:param2',
                    service: {
                        serviceOrigin: 'http://example.com',
                        serviceName: 'test',
                    },
                },
                {
                    param1: 'bye',
                },
            ],
            throws: {
                matchMessage: "Missing value for path param 'param2'",
            },
        },
    ]);
});

describe('FetchEndpointParameters', () => {
    it('includes request data', () => {
        assert.tsType<FetchEndpointParameters<(typeof mockService.endpoints)['/test']>>().equals<
            Readonly<{
                pathParams?: never;
                requestData: Readonly<{
                    somethingHere: string;
                    testValue: number;
                }>;
                method?: never;
                options?: FetchOptions;
                fetch?: GenericFetchEndpointParams['fetch'];
            }>
        >();
    });
    it('includes url params', () => {
        assert
            .tsType<
                FetchEndpointParameters<(typeof mockService.endpoints)['/with/:param1/:param2']>
            >()
            .equals<
                Readonly<{
                    pathParams: Readonly<Record<'param1' | 'param2', string>>;
                    requestData?: never;
                    method: HttpMethod.Get | HttpMethod.Head | 'GET' | 'HEAD';
                    options?: FetchOptions;
                    fetch?: GenericFetchEndpointParams['fetch'];
                }>
            >();
    });
    it('returns response type', async () => {
        assert
            .tsType(
                await fetchEndpoint(mockService.endpoints['/test'], {
                    requestData: {
                        somethingHere: 'hi',
                        testValue: -1,
                    },
                    fetch() {
                        return Promise.resolve(
                            createMockResponse({
                                result: 1,
                                requestData: {
                                    somethingHere: 'hi',
                                    testValue: -1,
                                },
                            }),
                        );
                    },
                }),
            )
            .equals<
                Readonly<{
                    data: Readonly<{
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
                    response: Readonly<Response>;
                }>
            >();
    });

    async function testFetchEndpoint(
        endpoint: Endpoint,
        params: Readonly<GenericFetchEndpointParams>,
    ) {
        let url = '';
        let requestInit: RequestInit = {};

        await fetchEndpoint<NoParam>(endpoint, {
            ...params,
            fetch(givenUrl, givenRequestInit) {
                url = givenUrl;
                requestInit = givenRequestInit;
                return Promise.resolve(
                    createMockResponse(endpoint.responseDataShape?.defaultValue),
                );
            },
        });

        return {
            url,
            requestInit,
        };
    }

    itCases(testFetchEndpoint, [
        {
            it: 'sends a body with default method',
            inputs: [
                mockService.endpoints['/test'],
                {
                    requestData: {
                        somethingHere: 'hi',
                        testValue: 4,
                    },
                },
            ],
            expect: {
                url: 'https://example.com/test',
                requestInit: {
                    body: JSON.stringify({
                        somethingHere: 'hi',
                        testValue: 4,
                    }),
                    method: HttpMethod.Get,
                },
            },
        },
        {
            it: 'uses path params with a chosen method',
            inputs: [
                mockService.endpoints['/with/:param1/:param2'],
                {
                    pathParams: {
                        param1: 'hi',
                        param2: 'bye',
                    },
                    method: HttpMethod.Head,
                },
            ],
            expect: {
                url: 'https://example.com/with/hi/bye',
                requestInit: {
                    method: HttpMethod.Head,
                },
            },
        },
        {
            it: 'rejects unexpected request data',
            inputs: [
                mockService.endpoints['/with/:param1/:param2'],
                {
                    pathParams: {
                        param1: 'hi',
                        param2: 'bye',
                    },
                    method: HttpMethod.Head,
                    requestData: {
                        invalid: 'hi',
                    },
                },
            ],
            throws: {
                matchMessage: 'not expecting any request data',
            },
        },
        {
            it: 'rejects a missing method',
            inputs: [
                mockService.endpoints['/with/:param1/:param2'],
                {
                    pathParams: {
                        param1: 'hi',
                        param2: 'bye',
                    },
                },
            ],
            throws: {
                matchMessage: 'allows multiple HTTP methods, one must be chosen',
            },
        },
        {
            it: 'rejects an endpoint without any allowed methods',
            inputs: [
                {
                    ...mockService.endpoints['/with/:param1/:param2'],
                    // @ts-expect-error: intentionally missing methods
                    methods: {},
                },
                {
                    pathParams: {
                        param1: 'hi',
                        param2: 'bye',
                    },
                },
            ],
            throws: {
                matchMessage: 'has no allowed HTTP methods',
            },
        },
        {
            it: 'rejects an endpoint without any allowed methods',
            inputs: [
                mockService.endpoints['/with/:param1/:param2'],
                {
                    pathParams: {
                        param1: 'hi',
                        param2: 'bye',
                    },
                    method: HttpMethod.Trace,
                },
            ],
            throws: {
                matchMessage: 'is not allowed for endpoint',
            },
        },
    ]);
});
