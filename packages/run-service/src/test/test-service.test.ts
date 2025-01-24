import {assert} from '@augment-vir/assert';
import {it} from '@augment-vir/test';
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
