import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import {createMockFetch, createMockFetchResponse} from './mock-fetch.js';

const mockResponseData: (typeof mockService.endpoints)['/test']['ResponseType'] = {
    requestData: {
        somethingHere: 'hi',
        testValue: 4,
    },
    result: -1,
};

describe(createMockFetchResponse.name, () => {
    it('creates a mock response', async () => {
        const response = createMockFetchResponse(mockService.endpoints['/test'], {
            responseData: mockResponseData,
        });

        /**
         * Using `strictEquals` here because the mock response should directly return the given
         * `responseData` value.
         */
        assert.strictEquals(await response.json(), mockResponseData);
    });
});

describe(createMockFetch.name, () => {
    it('creates a mock fetch', async () => {
        const mockFetch = createMockFetch(mockService.endpoints['/test'], {
            responseData: mockResponseData,
        });

        const response = await mockFetch('some-url');

        /**
         * Using `strictEquals` here because the mock response should directly return the given
         * `responseData` value.
         */
        assert.strictEquals(await response.json(), mockResponseData);
        assert.strictEquals(response.url, 'some-url');
    });
    it('handles a URL object input', async () => {
        assert.strictEquals(
            (
                await createMockFetch(mockService.endpoints['/test'], {
                    responseData: mockResponseData,
                })(new URL('https://example.com/some-url2'))
            ).url,
            'https://example.com/some-url2',
        );
    });
    it('handles a Request input', async () => {
        assert.strictEquals(
            (
                await createMockFetch(mockService.endpoints['/test'], {
                    responseData: mockResponseData,
                })(new Request('https://example.com/some-url3'))
            ).url,
            'https://example.com/some-url3',
        );
    });
});
