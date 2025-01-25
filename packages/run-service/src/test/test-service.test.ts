import {assert} from '@augment-vir/assert';
import {it} from '@augment-vir/test';
import {AnyOrigin, defineService, HttpMethod, HttpStatus} from '@rest-vir/define-service';
import {implementService} from '@rest-vir/implement-service';
import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock.js';
import {describeService} from './test-service.js';

describeService({service: mockServiceImplementation}, ({fetchService}) => {
    it('responds to a request', async () => {
        const response = await fetchService['/empty']();

        assert.isTrue(response.ok);
    });
    it('rejects an invalid request', async () => {
        const response = await fetchService['/test']();

        assert.isFalse(response.ok);
    });
});

const serviceWithNoAuth = implementService(
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
        serviceName: 'no auth',
        serviceOrigin: 'https://example.com',
    }),
    {
        '/health'() {
            return {
                statusCode: HttpStatus.Ok,
            };
        },
    },
    {
        context: undefined,
    },
);

describeService({service: serviceWithNoAuth, options: {}}, ({fetchService}) => {
    it('responds to a request', async () => {
        const response = await fetchService['/health']();

        assert.isTrue(response.ok);
    });
});
