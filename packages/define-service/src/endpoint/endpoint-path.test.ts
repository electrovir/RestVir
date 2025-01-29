import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {assertValidEndpointPath, PathParams} from './endpoint-path.js';

describe('PathParams', () => {
    it('extracts path params', () => {
        assert.tsType<PathParams<'/my-path/:hello/something/:derp'>>().equals<'hello' | 'derp'>();
    });
    it('extracts nothing', () => {
        assert.tsType<PathParams<'/my-path'>>().equals<never>();
    });
});

describe(assertValidEndpointPath.name, () => {
    itCases(assertValidEndpointPath, [
        {
            it: 'matches the root path',
            input: '/',
            throws: undefined,
        },
        {
            it: 'matches a valid path',
            input: '/endpoint',
            throws: undefined,
        },
        {
            it: 'rejects missing leading slash',
            input: 'endpoint',
            throws: {
                matchMessage: 'Path does not start with /',
            },
        },
        {
            it: 'rejects trailing slash',
            input: '/endpoint/',
            throws: {
                matchMessage: 'Path cannot end with /',
            },
        },
    ]);
});
