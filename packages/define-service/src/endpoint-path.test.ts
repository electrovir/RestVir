import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {PathParams} from './endpoint-path.js';

describe('PathParams', () => {
    it('extracts path params', () => {
        assert.tsType<PathParams<'/my-path/:hello/something/:derp'>>().equals<'hello' | 'derp'>();
    });
    it('extracts nothing', () => {
        assert.tsType<PathParams<'/my-path'>>().equals<never>();
    });
});
