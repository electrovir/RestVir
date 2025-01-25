import {assert} from '@augment-vir/assert';
import type {AnyObject} from '@augment-vir/common';
import {HttpMethod, HttpStatus} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {type EndpointRequest, type EndpointResponse} from '@rest-vir/implement-service';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {handleEndpointRequest} from './handle-endpoint.js';

describe(handleEndpointRequest.name, () => {
    it('errors for unexpected response data', async () => {
        await assert.throws(
            () =>
                handleEndpointRequest(
                    {
                        method: HttpMethod.Get,
                        headers: {},
                    } as EndpointRequest,
                    {
                        header() {},
                        send() {},
                    } as AnyObject as EndpointResponse,
                    {
                        ...mockServiceImplementation.endpoints['/health'],
                        implementation() {
                            return {
                                responseData: {
                                    hi: '4',
                                },
                                statusCode: HttpStatus.Ok,
                            };
                        },
                    },
                    true,
                ),
            {
                matchMessage: 'Got response data but none was expected.',
            },
        );
    });
    it('handles endpoint error', async () => {
        await handleEndpointRequest(
            {
                method: HttpMethod.Get,
                headers: {},
            } as EndpointRequest,
            {
                header() {},
                send() {},
            } as AnyObject as EndpointResponse,
            {
                ...mockServiceImplementation.endpoints['/health'],
                implementation() {
                    throw new Error('Health failure');
                },
            },
            false,
        );
    });
});
