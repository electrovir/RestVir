import {describe, it} from '@augment-vir/test';

describe('index', () => {
    it('can be imported', async () => {
        await import('./index.js');
    });
});
