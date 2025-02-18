import {join, resolve} from 'node:path';

export const monoRepoDirPath = resolve(import.meta.dirname, '..', '..', '..', '..');
export const startServiceMocksDirPath = join(
    monoRepoDirPath,
    'packages',
    'run-service',
    'src',
    'start-service',
    'examples',
);
