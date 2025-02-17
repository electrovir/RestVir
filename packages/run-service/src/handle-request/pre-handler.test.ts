import {describe, it} from '@augment-vir/test';
import {AnyOrigin} from '@rest-vir/define-service';
import {
    defaultServiceLogger,
    type ImplementedEndpoint,
    type ServerRequest,
    type ServerResponse,
} from '@rest-vir/implement-service';
import {preHandler} from './pre-handler.js';

describe(preHandler.name, () => {
    it('ignores a missing implementation', async () => {
        await preHandler(
            {
                originalUrl: '/missing',
            } as ServerRequest,
            {
                header() {},
            } as unknown as ServerResponse,
            {
                createContext: undefined,
                endpoints: {
                    '/missing': undefined as unknown as ImplementedEndpoint,
                },
                serviceName: 'derp',
                requiredClientOrigin: AnyOrigin,
                serviceOrigin: '',
                webSockets: {},
                logger: defaultServiceLogger,
            },
            '',
        );
    });
});
