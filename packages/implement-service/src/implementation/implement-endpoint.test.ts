import {describe, it} from '@augment-vir/test';
import {GenericServiceImplementation} from './implement-endpoint.js';
import {mockServiceImplementation} from './implement-service.mock.js';

describe('GenericServiceImplementation', () => {
    it('can be assigned to from any service', () => {
        const service: GenericServiceImplementation = mockServiceImplementation;
    });
});
