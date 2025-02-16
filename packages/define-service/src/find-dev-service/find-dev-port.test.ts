import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {parseUrl} from 'url-vir';
import type {EndpointDefinition} from '../endpoint/endpoint.js';
import {findDevServicePort} from './find-dev-port.js';

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
                        return Promise.resolve({ok: true} as Response);
                    } else {
                        return Promise.resolve({ok: false} as Response);
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
