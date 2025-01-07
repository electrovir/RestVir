import {
    mergeDefinedProperties,
    type AnyObject,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {type Response} from 'express';

/**
 * A mock Express response with mock response data attached for easy testing and debugging.
 *
 * @category Util
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type MockExpressResponse = {
    mockData: {
        headers: Record<string, string | number | ReadonlyArray<string>>;
        body: unknown;
        status: number;
        sent: boolean;
    };
};

/**
 * Mocks Express's `Response` object. Currently this only implements only a few methods.
 *
 * @category Util
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function createMockExpressResponse(
    init: PartialWithUndefined<MockExpressResponse['mockData']> = {},
): Response & MockExpressResponse {
    const mockData = mergeDefinedProperties<MockExpressResponse['mockData']>(
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
            headers.forEach((value, key) => {
                mockData.headers[key] = value;
            });
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
        mockData,
    } satisfies Partial<Response> & MockExpressResponse as AnyObject as Response &
        MockExpressResponse;

    return mockResponse;
}
