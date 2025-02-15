import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {AnyOrigin} from '@rest-vir/define-service';
import type {ImplementedEndpoint, ServerRequest, ServerResponse} from '@rest-vir/implement-service';
import {preHandler} from './pre-handler.js';

describe(preHandler.name, () => {
    it('it errors out on a missing implementation', async () => {
        await assert.throws(
            () =>
                preHandler(
                    {
                        originalUrl: '/missing',
                    } as ServerRequest,
                    {} as ServerResponse,
                    {
                        createContext: undefined,
                        endpoints: {
                            '/missing': undefined as unknown as ImplementedEndpoint,
                        },
                        serviceName: 'derp',
                        requiredClientOrigin: AnyOrigin,
                        serviceOrigin: '',
                        webSockets: {},
                    },
                    '',
                ),
            {
                matchMessage: 'No implementation found',
            },
        );
    });
});
