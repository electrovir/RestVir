import {wrapInTry} from '@augment-vir/common';

export function parseJsonWithUndefined(data: string): any {
    return wrapInTry(() => JSON.parse(data), {
        fallbackValue: data === 'undefined' ? undefined : data,
    });
}
