import {HttpMethod} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import {ServiceDefinitionError} from '../service/service-definition.error.js';
import {assertValidEndpoint, EndpointDefinition, EndpointInit} from './endpoint.js';

describe('EndpointDefinition', () => {
    it('can be assigned to from any endpoint', () => {
        const myEndpoint: EndpointDefinition = mockService.endpoints['/empty'];
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
            requiredClientOrigin: '',
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
            requiredClientOrigin: '',
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
            requiredClientOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows undefined I/O shapes', () => {
        const testAssignment: EndpointInit<{[HttpMethod.Get]: true}, undefined, undefined> = {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredClientOrigin: '',
            methods: {[HttpMethod.Get]: true},
        };
    });
    it('allows assignment to default type params', () => {
        const genericAssignment: EndpointInit = mockService.init.endpoints['/test'];
    });
});

describe(assertValidEndpoint.name, () => {
    const exampleEndpoint = {
        path: '/hello',
        methods: {
            [HttpMethod.Get]: true,
        },
        isEndpoint: true,
        isWebSocket: false,
        service: {
            serviceName: 'test-service',
        },
    } as const;

    itCases(assertValidEndpoint, [
        {
            it: 'passes a valid endpoint',
            input: exampleEndpoint,
            throws: undefined,
        },
        {
            it: 'fails an invalid endpoint path',
            input: {
                ...exampleEndpoint,
                // @ts-expect-error: this path is intentionally invalid for the test
                path: 'bad-endpoint',
                service: {
                    serviceName: 'test-service',
                    // @ts-expect-error: this path is intentionally invalid for the test
                    endpointServicePath: 'bad-endpoint',
                },
            },
            throws: {
                matchConstructor: ServiceDefinitionError,
            },
        },
    ]);
});
