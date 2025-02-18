import {assert} from '@augment-vir/assert';
import {wait} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {parseUrl} from 'url-vir';
import type {EndpointDefinition} from '../endpoint/endpoint.js';
import {mockService} from '../service/define-service.mock.js';
import {findDevServicePort, findLivePort, mapServiceDevPort} from './find-dev-port.js';

describe(findDevServicePort.name, () => {
    async function testFindDevServicePort({
        origin,
        workingPort,
        maxScanDistance,
    }: {
        origin: string;
        workingPort: number;
        maxScanDistance?: number | undefined;
    }) {
        const fetchedPorts: number[] = [];

        await findDevServicePort(
            {
                endpoints: {
                    '/test': {
                        path: '/test',
                    } as unknown as EndpointDefinition,
                },
                serviceName: 'test service',
                serviceOrigin: origin,
            },
            {
                fetch(url) {
                    const {port} = parseUrl(url);
                    const fetchPort = Number(port);
                    fetchedPorts.push(fetchPort);

                    if (fetchPort === workingPort) {
                        return Promise.resolve({
                            headers: {
                                get() {
                                    return 'test service';
                                },
                            },
                            ok: true,
                        } as unknown as Response);
                    } else {
                        return Promise.resolve({
                            headers: {
                                get() {
                                    return 'test service';
                                },
                            },
                            ok: false,
                        } as unknown as Response);
                    }
                },
                maxScanDistance,
            },
        );

        return fetchedPorts;
    }

    itCases(testFindDevServicePort, [
        {
            it: 'finds the first port',
            input: {
                origin: 'localhost:3000',
                workingPort: 3000,
            },
            expect: [
                3000,
            ],
        },
        {
            it: 'finds a different port',
            input: {
                origin: 'localhost:3000',
                workingPort: 3003,
            },
            expect: [
                3000,
                3001,
                3002,
                3003,
            ],
        },
        {
            it: 'does not exceed max scan distance',
            input: {
                origin: 'localhost:3000',
                workingPort: 3003,
                maxScanDistance: 1,
            },
            throws: {
                matchMessage: 'Last scanned port: 3001',
            },
        },
        {
            it: 'rejects an origin without a port',
            input: {
                origin: 'localhost',
                workingPort: 3003,
                maxScanDistance: 1,
            },
            throws: {
                matchMessage: "origin doesn't use a port",
            },
        },
        {
            it: 'rejects an invalid port',
            input: {
                origin: 'localhost:blah',
                workingPort: 3003,
                maxScanDistance: 1,
            },
            throws: {
                matchMessage: "doesn't have a valid port",
            },
        },
    ]);

    it('rejects a service without endpoints', async () => {
        await assert.throws(
            () => findDevServicePort({endpoints: {}, serviceName: '', serviceOrigin: ''}),
            {
                matchMessage: 'Service has no endpoints',
            },
        );
    });
});

describe(findLivePort.name, () => {
    it('does not require a isValidResponse option', async () => {
        assert.strictEquals(
            await findLivePort('localhost:3000', '/my-path', {
                fetch(url) {
                    const {port} = parseUrl(url);
                    const fetchPort = Number(port);

                    if (fetchPort === 3002) {
                        return Promise.resolve({
                            ok: true,
                        } as unknown as Response);
                    } else {
                        return Promise.resolve({
                            ok: false,
                        } as unknown as Response);
                    }
                },
                maxScanDistance: 10,
            }),
            3002,
        );
    });
    it('times out', async () => {
        await assert.throws(
            () =>
                findLivePort('localhost:3000', '/my-path', {
                    async fetch(url) {
                        const {port} = parseUrl(url);
                        await wait({milliseconds: 10});

                        return {
                            ok: false,
                        } as unknown as Response;
                    },
                    maxScanDistance: 10_000,
                    timeout: {
                        milliseconds: 100,
                    },
                }),
            {
                matchMessage: 'Port scan timeout reached',
            },
        );
    });
});

describe(mapServiceDevPort.name, () => {
    it('finds a new port', async () => {
        const result = await mapServiceDevPort(mockService, {
            fetch(url) {
                const {port} = parseUrl(url);
                const fetchPort = Number(port);

                if (fetchPort === 3005) {
                    return Promise.resolve({
                        headers: {
                            get() {
                                return mockService.serviceName;
                            },
                        },
                        ok: true,
                    } as unknown as Response);
                } else {
                    return Promise.resolve({
                        headers: {
                            get() {
                                return mockService.serviceName;
                            },
                        },
                        ok: false,
                    } as unknown as Response);
                }
            },
            startingOriginOverride: 'http://localhost:3000',
        });
        assert.deepEquals(result.serviceOrigin, 'http://localhost:3005');
    });
});
