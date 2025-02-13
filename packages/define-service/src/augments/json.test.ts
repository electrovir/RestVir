import {describe, itCases} from '@augment-vir/test';
import {parseJsonWithUndefined} from './json.js';

describe(parseJsonWithUndefined.name, () => {
    itCases(parseJsonWithUndefined, [
        {
            it: 'handles stringified undefined',
            input: 'undefined',
            expect: undefined,
        },
        {
            it: 'handles normal JSON',
            input: JSON.stringify({
                a: 'hi',
                b: 'bye',
            }),
            expect: {
                a: 'hi',
                b: 'bye',
            },
        },
        {
            it: 'returns the origin input if JSON parsing fails',
            input: 'this is not [ valid } JSON',
            expect: 'this is not [ valid } JSON',
        },
    ]);
});
