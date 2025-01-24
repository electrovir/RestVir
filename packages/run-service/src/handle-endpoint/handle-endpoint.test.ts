import {assert} from '@augment-vir/assert';
import type {AnyObject} from '@augment-vir/common';
import {HttpMethod} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {mockService} from '@rest-vir/define-service/src/service/define-service.mock.js';
import {
    type EndpointRequest,
    type EndpointResponse,
    type GenericServiceImplementation,
    HttpStatus,
    defaultServiceLogger,
} from '@rest-vir/implement-service';
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
                    mockService.endpoints['/health'],
                    {
                        logger: defaultServiceLogger,
                        implementations: {
                            '/health'() {
                                return {
                                    responseData: {
                                        hi: '4',
                                    },
                                    statusCode: HttpStatus.Ok,
                                };
                            },
                        },
                    } as AnyObject as GenericServiceImplementation,
                    true,
                ),
            {
                matchMessage: 'Got response data but none was expected.',
            },
        );
    });
});
