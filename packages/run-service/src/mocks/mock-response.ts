import {
    mergeDefinedProperties,
    type AnyObject,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {type createMockFetchResponse} from '@rest-vir/define-service';
import type {EndpointResponse} from '@rest-vir/implement-service';

/**
 * A mock Express response with mock response data attached for easy testing and debugging.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type MockResponse = {
    mockData: {
        headers: Record<string, string | number | ReadonlyArray<string>>;
        body: unknown;
        status: number;
        sent: boolean;
    };
};

/**
 * Creates a `EndpointResponse` object for backend testing. **Do not use this mock for frontend
 * testing**. Instead use {@link createMockFetchResponse}
 *
 * @category Util
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function createMockResponse(
    init: PartialWithUndefined<MockResponse['mockData']> = {},
): EndpointResponse & MockResponse {
    const mockData = mergeDefinedProperties<MockResponse['mockData']>(
        {
            headers: {},
            body: undefined,
            status: -1,
            sent: false,
        },
        init,
    );

    const mockResponse = {
        sendStatus(status) {
            if (mockData.sent) {
                throw new Error(`Cannot send Response again.`);
            }

            mockData.sent = true;
            mockData.status = status;
            return mockResponse;
        },
        send(body) {
            if (mockData.sent) {
                throw new Error(`Cannot send Response again.`);
            }

            mockData.sent = true;
            mockData.body = body;
            return mockResponse;
        },
        setHeaders(headers) {
            Object.entries(headers).forEach(
                ([
                    key,
                    value,
                ]) => {
                    mockData.headers[key] = value;
                },
            );
            return mockResponse;
        },
        setHeader(name, value) {
            mockData.headers[name] = value;
            return mockResponse;
        },
        status(status: number) {
            mockData.status = status;
            return mockResponse;
        },
        get headersSent() {
            return mockData.sent;
        },
        removeHeader(headerName) {
            delete mockData.headers[headerName];
            return mockResponse;
        },
        mockData,
    } satisfies Partial<EndpointResponse> & MockResponse as AnyObject as EndpointResponse &
        MockResponse;

    return mockResponse;
}
