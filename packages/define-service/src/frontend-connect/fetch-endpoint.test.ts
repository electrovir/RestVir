import {assert} from '@augment-vir/assert';
import {HttpMethod} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {type Endpoint} from '../endpoint/endpoint.js';
import {mockService} from '../service/define-service.mock.js';
import {createMockFetch, createMockFetchResponse} from '../util/mock-fetch.js';
import {type NoParam} from '../util/no-param.js';
import {
    buildEndpointUrl,
    fetchEndpoint,
    type FetchEndpointParams,
    type GenericFetchEndpointParams,
} from './fetch-endpoint.js';

type FetchOptions = NonNullable<GenericFetchEndpointParams['options']>;

describe(buildEndpointUrl.name, () => {
    function testBuildEndpointUrl(
        endpoint: Pick<Endpoint, 'path'>,
        pathParams?: Record<string, string> | undefined,
    ) {
        return buildEndpointUrl(
            {
                service: {
                    serviceOrigin: 'http://example.com',
                    serviceName: 'test',
                },
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: undefined,
                ...endpoint,
            },
            {
                pathParams,
            },
        );
    }

    itCases(testBuildEndpointUrl, [
        {
            it: 'handles a path without params',
            inputs: [
                {
                    path: '/hi',
                },
            ],
            expect: 'http://example.com/hi',
        },
        {
            it: 'rejects path params when the endpoint has none',
            inputs: [
                {
                    path: '/hi',
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
                    path: '/hi/:param1/:param2',
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
                    path: '/hi/:param1/:param2',
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
        assert.tsType<FetchEndpointParams<(typeof mockService.endpoints)['/test']>>().equals<
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
            .tsType<FetchEndpointParams<(typeof mockService.endpoints)['/with/:param1/:param2']>>()
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
                    fetch: createMockFetch(mockService.endpoints['/test'], {
                        responseData: {
                            result: 1,
                            requestData: {
                                somethingHere: 'hi',
                                testValue: -1,
                            },
                        },
                    }),
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
                    createMockFetchResponse(endpoint, {
                        responseData: endpoint.responseDataShape?.defaultValue,
                    }),
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
                    method: HttpMethod.Post,
                    headers: {
                        'content-type': 'application/json',
                    },
                },
            },
        },
        {
            it: 'handles headers object',
            inputs: [
                mockService.endpoints['/test'],
                {
                    requestData: {
                        somethingHere: 'hi',
                        testValue: 4,
                    },
                    options: {
                        headers: new Headers({
                            'header-test': 'test',
                        }),
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
                    method: HttpMethod.Post,
                    headers: {
                        'content-type': 'application/json',
                        'header-test': 'test',
                    },
                },
            },
        },
        {
            it: 'handles array headers init',
            inputs: [
                mockService.endpoints['/test'],
                {
                    requestData: {
                        somethingHere: 'hi',
                        testValue: 4,
                    },
                    options: {
                        headers: [
                            [
                                'header-test',
                                'test',
                            ],
                        ],
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
                    method: HttpMethod.Post,
                    headers: {
                        'content-type': 'application/json',
                        'header-test': 'test',
                    },
                },
            },
        },
        {
            it: 'does not override existing content type header',
            inputs: [
                mockService.endpoints['/test'],
                {
                    requestData: {
                        somethingHere: 'hi',
                        testValue: 4,
                    },
                    options: {
                        headers: {
                            'content-type': 'derp',
                        },
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
                    method: HttpMethod.Post,
                    headers: {
                        'content-type': 'derp',
                    },
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
                    headers: {},
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
