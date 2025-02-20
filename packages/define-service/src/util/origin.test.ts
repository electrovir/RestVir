import {describe, itCases} from '@augment-vir/test';
import {isAnyOrigin} from './origin.js';

describe(isAnyOrigin.name, () => {
    itCases(isAnyOrigin, [
        {
            it: 'works with a separate object',
            input: {
                anyOrigin: true,
            },
            expect: true,
        },
        {
            it: 'rejects a string',
            input: 'AnyOrigin',
            expect: false,
        },
    ]);
});
