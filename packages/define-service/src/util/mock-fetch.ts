import {check} from '@augment-vir/assert';
import {
    copyThroughJson,
    HttpStatus,
    isErrorHttpStatus,
    type Overwrite,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {type IsNever} from 'type-fest';
import {type EndpointDefinition} from '../endpoint/endpoint.js';

/**
 * Options for {@link createMockEndpointResponse} and {@link createMockEndpointFetch}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MockEndpointResponseOptions<EndpointToMock extends EndpointDefinition> = Overwrite<
    MockResponseParams,
    IsNever<Extract<EndpointToMock['ResponseType'], undefined>> extends true
        ? {
              body: EndpointToMock['ResponseType'];
          }
        : {
              body?: EndpointToMock['ResponseType'];
          }
>;

/**
 * Creates a mocked fetch `Response` object for the given endpoint (requiring a type safe body).
 *
 * @category Testing
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockEndpointResponse<const EndpointToMock extends EndpointDefinition>(
    endpoint: EndpointToMock,
    params: Readonly<MockEndpointResponseOptions<EndpointToMock>>,
) {
    return createMockResponse(params);
}

/**
 * Parameters for {@link createMockResponse}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MockResponseParams = Overwrite<
    Partial<Pick<Response, 'redirected' | 'statusText' | 'type'>>,
    PartialWithUndefined<{
        status: HttpStatus;
        url: string | URL;
        headers: HeadersInit;
        body: unknown;
    }>
>;

/**
 * A `ReadableStream` implementation used by {@link createMockResponse} to create its streamed `body`
 * property.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export class MockResponseBodyStream extends ReadableStream<Uint8Array> {
    constructor(
        body: unknown,
        private getReaderCalled: () => void,
    ) {
        super({
            start(controller) {
                if (body instanceof Uint8Array) {
                    controller.enqueue(body);
                } else if (check.isString(body)) {
                    controller.enqueue(new TextEncoder().encode(body));
                } else if (body) {
                    controller.enqueue(new TextEncoder().encode(JSON.stringify(body)));
                }
                controller.close();
            },
        });
    }

    public override getReader(...args: any): any {
        this.getReaderCalled();
        return super.getReader(...args);
    }
}

/**
 * Creates a mocked fetch `Response` object.
 *
 * @category Testing
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockResponse(params: Readonly<MockResponseParams> = {}): Response {
    const {
        headers = [],
        status = HttpStatus.Ok,
        url = '',
        redirected,
        statusText = '',
        type = 'basic',
        body,
    } = params;

    function createArrayBuffer(this: void) {
        return check.instanceOf(body, ArrayBuffer)
            ? body
            : new TextEncoder().encode(typeof body === 'string' ? body : JSON.stringify(body))
                  .buffer;
    }

    let bodyUsed = false;

    return {
        headers: new Headers(headers),
        ok: !isErrorHttpStatus(status),
        body: new MockResponseBodyStream(body, () => {
            if (bodyUsed) {
                throw new TypeError('Body is disturbed or locked.');
            }
            bodyUsed = true;
        }),
        get bodyUsed() {
            return bodyUsed;
        },
        status,
        arrayBuffer() {
            if (bodyUsed) {
                throw new TypeError('Body is disturbed or locked.');
            }
            bodyUsed = true;
            return Promise.resolve(createArrayBuffer());
        },
        blob() {
            if (bodyUsed) {
                throw new TypeError('Body is disturbed or locked.');
            }
            bodyUsed = true;
            return Promise.resolve(new Blob([createArrayBuffer()]));
        },
        bytes() {
            if (bodyUsed) {
                throw new TypeError('Body is disturbed or locked.');
            }
            bodyUsed = true;
            return Promise.resolve(
                check.instanceOf(body, Uint8Array) ? body : new Uint8Array(createArrayBuffer()),
            );
        },
        formData() {
            if (bodyUsed) {
                throw new TypeError('Body is disturbed or locked.');
            }
            bodyUsed = true;
            const formData = new FormData();
            if (check.isObject(body)) {
                Object.entries(body).forEach(
                    ([
                        key,
                        value,
                    ]) => {
                        formData.append(
                            key,
                            check.isString(value)
                                ? value
                                : check.instanceOf(value, Blob)
                                  ? value
                                  : JSON.stringify(value),
                        );
                    },
                );
            }
            return Promise.resolve(formData);
        },
        text() {
            if (bodyUsed) {
                throw new TypeError('Body is disturbed or locked.');
            }
            bodyUsed = true;
            return Promise.resolve(check.isString(body) ? body : JSON.stringify(body));
        },
        json() {
            if (bodyUsed) {
                throw new TypeError('Body is disturbed or locked.');
            }
            bodyUsed = true;
            return Promise.resolve(check.isString(body) ? JSON.parse(body) : copyThroughJson(body));
        },
        url: String(url),
        redirected: !!redirected,
        statusText,
        type,
        clone() {
            return createMockResponse(params);
        },
    };
}

/**
 * Creates a mock `fetch` function that returns a mock `Response` object that matches the
 * expectations of the given endpoint.
 *
 * @category Testing
 * @category Package : @rest-vir/define-service
 * @example
 *
 * ```ts
 * import {createMockEndpointFetch, fetchEndpoint} from '@rest-vir/define-service';
 *
 * fetchEndpoint(myService.endpoints['/my-path'], {
 *     fetch: createMockEndpointFetch(myService.endpoints['/my-path'], {
 *         body: 'some body',
 *         // there are other properties that can be mocked as well, see the types for more details
 *     }),
 * });
 * ```
 *
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockEndpointFetch<const EndpointToMock extends EndpointDefinition>(
    endpoint: EndpointToMock,
    params: Readonly<Omit<MockEndpointResponseOptions<EndpointToMock>, 'url'>>,
): typeof globalThis.fetch {
    return createMockFetch(params);
}

/**
 * Creates a mock `fetch` function that returns a mock `Response` object based on the given response
 * parameters.
 *
 * @category Testing
 * @category Package : @rest-vir/define-service
 * @example
 *
 * ```ts
 * import {createMockFetch, fetchEndpoint} from '@rest-vir/define-service';
 *
 * fetchEndpoint(myService.endpoints['/my-path'], {
 *     fetch: createMockFetch({
 *         body: 'some body',
 *         // there are other properties that can be mocked as well, see the types for more details
 *     }),
 * });
 * ```
 *
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function createMockFetch(
    params: Readonly<Omit<MockResponseParams, 'url'>> = {},
): typeof globalThis.fetch {
    return (...args: Parameters<(typeof globalThis)['fetch']>) => {
        const url: string = check.instanceOf(args[0], URL)
            ? args[0].toString()
            : check.isString(args[0])
              ? args[0]
              : args[0].url;

        const mockResponse = createMockResponse({
            ...params,
            url,
        });
        return Promise.resolve(mockResponse);
    };
}
