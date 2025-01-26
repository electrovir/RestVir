import {assert} from '@augment-vir/assert';
import {HttpMethod, HttpStatus} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {testEndpoint} from './test-endpoint.js';
import {condenseResponse} from './test-service.js';

describe(testEndpoint.name, () => {
    it('tests a basic endpoint', async () => {
        const response = await testEndpoint(mockServiceImplementation.endpoints['/empty']);

        assert.deepEquals(await condenseResponse(response), {
            headers: {'access-control-allow-origin': '*'},
            status: HttpStatus.Ok,
        });
    });
    it('tests a failed response', async () => {
        const response = await testEndpoint(
            mockServiceImplementation.endpoints['/test'],
            // @ts-expect-error: params are required for the request body
            {},
        );

        assert.deepEquals(await condenseResponse(response), {
            headers: {'access-control-allow-origin': '*'},
            status: HttpStatus.BadRequest,
        });
    });
    it('tests a post request', async () => {
        const response = await testEndpoint(mockServiceImplementation.endpoints['/test'], {
            requestData: {
                somethingHere: 'hi',
                testValue: -1,
            },
        });

        assert.deepEquals(await condenseResponse(response), {
            headers: {
                'access-control-allow-origin': '*',
                'content-type': 'application/json; charset=utf-8',
            },
            status: HttpStatus.Ok,
            body: JSON.stringify({
                requestData: {somethingHere: 'hi', testValue: -1},
                result: 4,
            } satisfies (typeof mockServiceImplementation.endpoints)['/test']['ResponseType']),
        });
    });
    it('fails a wrong method', async () => {
        await assert.throws(
            () =>
                testEndpoint(mockServiceImplementation.endpoints['/test'], {
                    requestData: {
                        somethingHere: 'hi',
                        testValue: -1,
                    },
                    // @ts-expect-error: incorrect method
                    method: HttpMethod.Get,
                }),
            {
                matchMessage: "Given HTTP method 'GET' is not allowed for endpoint",
            },
        );
    });
    it('requires path params', async () => {
        await assert.throws(
            () =>
                // @ts-expect-error: this endpoint is missing its path params
                testEndpoint(mockServiceImplementation.endpoints['/with/:param1/:param2']),
            {
                matchMessage: 'Missing value for path param',
            },
        );
    });
});
