import {describe, it} from '@augment-vir/test';
import type {mockService} from '../service/define-service.mock.js';
import type {NoParam} from '../util/no-param.js';
import {CollapsedConnectSocketParams} from './connect-socket.js';

describe('CollapsedConnectSocketParams', () => {
    it('uses NoParam for generic params', () => {
        const genericParams: CollapsedConnectSocketParams<NoParam> =
            {} as CollapsedConnectSocketParams<
                (typeof mockService.sockets)['/custom-props-socket']
            >;
    });
});
