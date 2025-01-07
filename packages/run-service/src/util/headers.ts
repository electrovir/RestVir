import {getObjectTypedEntries} from '@augment-vir/common';
import {Response} from 'express';

/** Any headers set to `undefined` will be removed and not set. */
export type HeadersToSet = Record<string, number | string | readonly string[] | undefined>;

export type MinimalResponseForApplyingHeaders = {
    setHeader: (...args: Parameters<Response['setHeader']>) => unknown;
    removeHeader(headerName: string): void;
};

export function setResponseHeaders(
    response: Readonly<MinimalResponseForApplyingHeaders>,
    headers: Readonly<HeadersToSet>,
): void {
    getObjectTypedEntries(headers).forEach(
        ([
            name,
            value,
        ]) => {
            if (value == undefined) {
                response.removeHeader(name);
            } else {
                response.setHeader(name, value);
            }
        },
    );
}
