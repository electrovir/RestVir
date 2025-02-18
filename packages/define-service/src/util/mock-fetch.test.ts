import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import {
    createMockEndpointFetch,
    createMockEndpointResponse,
    createMockFetch,
    createMockResponse,
} from './mock-fetch.js';

const mockResponseData: (typeof mockService.endpoints)['/test']['ResponseType'] = {
    requestData: {
        somethingHere: 'hi',
        testValue: 4,
    },
    result: -1,
};

describe(createMockEndpointResponse.name, () => {
    it('creates a mock response', async () => {
        const response = createMockEndpointResponse(mockService.endpoints['/test'], {
            body: mockResponseData,
        });

        assert.deepEquals(await response.json(), mockResponseData);
    });
});

describe(createMockEndpointFetch.name, () => {
    it('creates a mock fetch', async () => {
        const mockFetch = createMockEndpointFetch(mockService.endpoints['/test'], {
            body: mockResponseData,
        });

        const response = await mockFetch('some-url');

        assert.deepEquals(await response.json(), mockResponseData);
        assert.strictEquals(response.url, 'some-url');
    });
    it('handles a URL object input', async () => {
        assert.strictEquals(
            (
                await createMockEndpointFetch(mockService.endpoints['/test'], {
                    body: mockResponseData,
                })(new URL('https://example.com/some-url2'))
            ).url,
            'https://example.com/some-url2',
        );
    });
    it('handles a Request input', async () => {
        assert.strictEquals(
            (
                await createMockEndpointFetch(mockService.endpoints['/test'], {
                    body: mockResponseData,
                })(new Request('https://example.com/some-url3'))
            ).url,
            'https://example.com/some-url3',
        );
    });
});

describe(createMockFetch.name, () => {
    it('handles a string URL', async () => {
        const response = await createMockFetch()('localhost:0');
        assert.strictEquals(response.url, 'localhost:0');
    });
    it('handles a URL instance', async () => {
        const response = await createMockFetch()(new URL('localhost:0'));
        assert.strictEquals(response.url, 'localhost:0');
    });
    it('handles a request init', async () => {
        const response = await createMockFetch()(new Request('localhost:0'));
        assert.strictEquals(response.url, 'localhost:0');
    });
});

async function readBodyStream(response: Response): Promise<unknown> {
    assert.isDefined(response.body);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
        const {done, value} = await reader.read();
        if (done) {
            break;
        }
        result += decoder.decode(value, {stream: true});
    }

    result += decoder.decode();

    return result;
}

describe(createMockResponse.name, () => {
    it('supports Response.body for a string body', async () => {
        const response = createMockResponse({body: 'hi'});

        const result = await readBodyStream(response);

        assert.strictEquals(result, 'hi');
        assert.isTrue(response.bodyUsed);
        assert.throws(() => response.body?.getReader());
    });
    it('supports Response.body for an object body', async () => {
        const response = createMockResponse({body: {hi: 'hi'}});

        const result = await readBodyStream(response);

        assert.strictEquals(result, JSON.stringify({hi: 'hi'}));
        assert.isTrue(response.bodyUsed);
        assert.throws(() => response.body?.getReader());
    });
    it('supports Response.body for a Uint8Array body', async () => {
        const body: Uint8Array = new TextEncoder().encode('bye');
        const response = createMockResponse({body});

        const result = await readBodyStream(response);

        assert.strictEquals(result, 'bye');
        assert.isTrue(response.bodyUsed);
        assert.throws(() => response.body?.getReader());
    });
    it('supports Response.arrayBuffer()', async () => {
        const response = createMockResponse({body: 'hi'});

        assert.strictEquals(new TextDecoder().decode(await response.arrayBuffer()), 'hi');
        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.arrayBuffer());
    });
    it('supports Response.arrayBuffer() for an ArrayBuffer body', async () => {
        const body = new TextEncoder().encode('hello').buffer;
        const response = createMockResponse({body});

        assert.strictEquals(new TextDecoder().decode(await response.arrayBuffer()), 'hello');
        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.arrayBuffer());
    });
    it('supports Response.blob()', async () => {
        const response = createMockResponse({body: 'hi'});

        assert.strictEquals(await (await response.blob()).text(), 'hi');
        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.blob());
    });
    it('supports Response.bytes()', async () => {
        const response = createMockResponse({body: 'hi'});

        assert.strictEquals(new TextDecoder().decode(await response.bytes()), 'hi');
        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.bytes());
    });
    it('supports Response.text()', async () => {
        const response = createMockResponse({body: 'hi'});

        assert.strictEquals(await response.text(), 'hi');
        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.text());
    });
    it('supports Response.formData()', async () => {
        const response = createMockResponse({
            body: {
                hi: 'bye',
                hi2: {not: 'a string'},
                hi3: new Blob(['something'], {type: 'text/plain'}),
            },
        });

        const formData = await response.formData();
        const formEntries = Array.from(formData.entries());

        assert.deepEquals(formEntries.slice(0, 2), [
            [
                'hi',
                'bye',
            ],
            [
                'hi2',
                JSON.stringify({not: 'a string'}),
            ],
        ]);

        assert.instanceOf(formEntries[2]?.[1], Blob);
        assert.strictEquals(formEntries[2]?.[0], 'hi3');

        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.formData());
    });
    it('supports Response.json()', async () => {
        const response = createMockResponse({body: {hi: 'bye'}});

        assert.deepEquals(await response.json(), {
            hi: 'bye',
        });
        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.json());
    });
    it('supports Response.clone()', async () => {
        const response = createMockResponse({body: {hi: 'bye'}});
        const response2 = response.clone();

        assert.deepEquals(await response.json(), {
            hi: 'bye',
        });
        assert.isTrue(response.bodyUsed);
        await assert.throws(() => response.json());

        assert.deepEquals(await response2.json(), {
            hi: 'bye',
        });
        assert.isTrue(response2.bodyUsed);
        await assert.throws(() => response2.json());
    });
});
