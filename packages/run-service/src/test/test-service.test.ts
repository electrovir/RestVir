import {assert} from '@augment-vir/assert';
import {randomInteger} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin, defineService, HttpMethod, HttpStatus} from '@rest-vir/define-service';
import {implementService} from '@rest-vir/implement-service';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {condenseResponse, describeService, testService} from './test-service.js';

describeService({service: mockServiceImplementation}, ({fetchService}) => {
    it('responds to a request', async () => {
        const response = await fetchService['/empty']();

        assert.isTrue(response.ok);
    });
    it('rejects an invalid request', async () => {
        const response = await fetchService['/test']({
            // @ts-expect-error: invalid request data
            requestData: undefined,
        });

        assert.isFalse(response.ok);
    });
});

const plainService = implementService(
    defineService({
        endpoints: {
            '/health': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: undefined,
            },
        },
        requiredOrigin: AnyOrigin,
        serviceName: 'plain service',
        serviceOrigin: 'https://example.com',
    }),
    {
        context: undefined,
    },
    {
        endpoints: {
            '/health'() {
                return {
                    statusCode: HttpStatus.Ok,
                };
            },
        },
    },
);

describeService({service: plainService, options: {}}, ({fetchService}) => {
    it('responds to a request', async () => {
        const response = await fetchService['/health']();

        assert.isTrue(response.ok);
    });
    it('includes fastify headers', async () => {
        const response = await fetchService['/health']();

        assert.hasKeys((await condenseResponse(response, {includeFastifyHeaders: true})).headers, [
            'access-control-allow-origin',
            'connection',
            'content-length',
            'date',
        ]);
    });
});

describe(testService.name, () => {
    it('works with an actual port', async () => {
        const {fetchService, kill} = await testService(plainService, {
            port: 4500 + randomInteger({min: 0, max: 4000}),
        });

        try {
            assert.deepEquals(await condenseResponse(await fetchService['/health']()), {
                headers: {
                    'access-control-allow-origin': '*',
                },
                status: HttpStatus.Ok,
            });
        } finally {
            kill();
        }
    });
});
