import {check} from '@augment-vir/assert';
import {HttpStatus, isErrorHttpStatus} from '@augment-vir/common';
import type {IsNever} from 'type-fest';
import type {Endpoint} from '../endpoint/endpoint.js';

/**
 * Options for {@link createMockFetchResponse} and {@link createMockFetch}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MockFetchResponseOptions<EndpointToMock extends Endpoint> = (IsNever<
    Extract<EndpointToMock['ResponseType'], undefined>
> extends true
    ? {
          responseData: EndpointToMock['ResponseType'];
      }
    : {
          responseData?: EndpointToMock['ResponseType'];
      }) & {
    status?: HttpStatus | undefined;
    url?: string | undefined;
    headers?: Record<string, string> | undefined;
};

/**
 * Mocks a fetch's `Response` value. Currently this only implements the `json` method.
 *
 * @category Testing
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockFetchResponse<const EndpointToMock extends Endpoint>(
    endpoint: EndpointToMock,
    {
        responseData = undefined,
        status = HttpStatus.Ok,
        headers = {},
        url = '',
    }: MockFetchResponseOptions<EndpointToMock> = {
        responseData: undefined,
        status: HttpStatus.Ok,
        headers: {},
        url: '',
    },
) {
    return {
        ok: isErrorHttpStatus(status),
        status,
        headers: new Headers(headers),
        json() {
            return Promise.resolve(responseData);
        },
        url,
    } satisfies Partial<Awaited<ReturnType<(typeof globalThis)['fetch']>>> as Awaited<
        ReturnType<(typeof globalThis)['fetch']>
    >;
}

/**
 * Mocks `fetch` for a defined endpoint.
 *
 * @category Testing
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockFetch<const EndpointToMock extends Endpoint>(
    endpoint: EndpointToMock,
    options: Omit<MockFetchResponseOptions<EndpointToMock>, 'url'>,
) {
    return (...args: Parameters<(typeof globalThis)['fetch']>) => {
        const url: string = check.instanceOf(args[0], URL)
            ? args[0].toString()
            : check.isString(args[0])
              ? args[0]
              : args[0].url;

        const mockResponse = createMockFetchResponse(endpoint, {
            ...options,
            url,
        } as MockFetchResponseOptions<EndpointToMock>);
        return Promise.resolve(mockResponse);
    };
}
