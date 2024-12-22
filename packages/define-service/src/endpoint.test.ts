import {describe, it, itCases} from '@augment-vir/test';
import {MyAuth, mockService} from './define-service.mock.js';
import {Endpoint, EndpointInit, assertValidEndpoint} from './endpoint.js';
import {HttpMethod} from './http-method.js';
import {ServiceDefinitionError} from './service-definition.error.js';

describe('EndpointInit', () => {
    it('allows defined input shape', () => {
        const testAssignment: EndpointInit<
            MyAuth[],
            {[HttpMethod.Get]: true},
            {inputTest: string},
            undefined
        > = {
            requiredAuth: [MyAuth.Admin],
            requestDataShape: {inputTest: 'a'},
            responseDataShape: undefined,
            requiredClientOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows defined output shape', () => {
        const testAssignment: EndpointInit<
            MyAuth[],
            {[HttpMethod.Get]: true},
            undefined,
            {outputTest: string; anotherProp: number}
        > = {
            requiredAuth: [MyAuth.Admin],
            requestDataShape: undefined,
            responseDataShape: {outputTest: 'b', anotherProp: 4},
            requiredClientOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows both I/O shapes', () => {
        const testAssignment: EndpointInit<
            MyAuth[],
            {[HttpMethod.Get]: true},
            {inputTest: string},
            {outputTest: string; anotherProp: number}
        > = {
            requiredAuth: [MyAuth.Admin],
            requestDataShape: {inputTest: 'a'},
            responseDataShape: {outputTest: 'b', anotherProp: 4},
            requiredClientOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows undefined I/O shapes', () => {
        const testAssignment: EndpointInit<
            MyAuth[],
            {[HttpMethod.Get]: true},
            undefined,
            undefined
        > = {
            requiredAuth: [MyAuth.Admin],
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows assignment to default type params', () => {
        const genericAssignment: Endpoint = mockService.endpoints['/test'];
    });
});

describe(assertValidEndpoint.name, () => {
    const exampleEndpoint = {
        requiredAuth: [MyAuth.Admin],
        endpointPath: '/hello',
        methods: {
            [HttpMethod.Get]: true,
        },
    } as const;

    const exampleServiceStuff = {
        serviceName: 'test-service',
        allowedAuth: [
            MyAuth.Admin,
            MyAuth.Manager,
            MyAuth.User,
        ],
    } as const;

    itCases(assertValidEndpoint, [
        {
            it: 'passes a valid endpoint',
            inputs: [
                exampleEndpoint,
                exampleServiceStuff,
            ],
            throws: undefined,
        },
        {
            it: 'fails an endpoint with missing auth',
            inputs: [
                {
                    ...exampleEndpoint,
                    requiredAuth: [],
                },
                exampleServiceStuff,
            ],
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
        {
            it: 'passing an endpoint that does not require auth',
            inputs: [
                {
                    ...exampleEndpoint,
                    requiredAuth: undefined,
                },
                exampleServiceStuff,
            ],
            throws: undefined,
        },
        {
            it: 'rejects an endpoint with invalid auth',
            inputs: [
                {
                    ...exampleEndpoint,
                    requiredAuth: [
                        'not-valid-auth',
                    ],
                },
                exampleServiceStuff,
            ],
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
        {
            it: 'fails an invalid endpoint path',
            inputs: [
                {
                    ...exampleEndpoint,
                    // @ts-expect-error: this path is intentionally invalid for the test
                    endpointPath: 'bad-endpoint',
                },
                {
                    // @ts-expect-error: this path is intentionally invalid for the test
                    endpointServicePath: 'bad-endpoint',
                    serviceName: 'test-service',
                },
            ],
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
    ]);
});
