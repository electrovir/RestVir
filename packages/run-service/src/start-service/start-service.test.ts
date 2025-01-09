import {describe} from '@augment-vir/test';
import {startService} from './start-service.js';

const testCases: {file: string; expect: string[]}[] = [
    {
        file: 'single-thread',
        expect: [],
    },
];

describe(startService.name, () => {});
