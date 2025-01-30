import {HttpMethod} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import {ServiceDefinitionError} from '../service/service-definition.error.js';
import {assertValidEndpoint, Endpoint, EndpointInit} from './endpoint.js';

describe('Endpoint', () => {
    it('can be assigned to from any endpoint', () => {
        const myEndpoint: Endpoint = mockService.endpoints['/empty'];
    });
});

describe('EndpointInit', () => {
    it('allows defined input shape', () => {
        const testAssignment: EndpointInit<
            {[HttpMethod.Get]: true},
            {inputTest: string},
            undefined
        > = {
            requestDataShape: {inputTest: 'a'},
            responseDataShape: undefined,
            requiredOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows defined output shape', () => {
        const testAssignment: EndpointInit<
            {[HttpMethod.Get]: true},
            undefined,
            {outputTest: string; anotherProp: number}
        > = {
            requestDataShape: undefined,
            responseDataShape: {outputTest: 'b', anotherProp: 4},
            requiredOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows both I/O shapes', () => {
        const testAssignment: EndpointInit<
            {[HttpMethod.Get]: true},
            {inputTest: string},
            {outputTest: string; anotherProp: number}
        > = {
            requestDataShape: {inputTest: 'a'},
            responseDataShape: {outputTest: 'b', anotherProp: 4},
            requiredOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows undefined I/O shapes', () => {
        const testAssignment: EndpointInit<{[HttpMethod.Get]: true}, undefined, undefined> = {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows assignment to default type params', () => {
        const genericAssignment: EndpointInit = mockService.init.endpoints['/test'];
    });
});

describe(assertValidEndpoint.name, () => {
    const exampleEndpoint = {
        endpointPath: '/hello',
        methods: {
            [HttpMethod.Get]: true,
        },
    } as const;

    const exampleServiceStuff = {
        serviceName: 'test-service',
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
