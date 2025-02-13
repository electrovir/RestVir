import {describe, it} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import type {WebSocketDefinition} from './web-socket-definition.js';

describe('WebSocketDefinition', () => {
    it('is assignable to from any socket definition', () => {
        const genericWebSocket: WebSocketDefinition =
            mockService.sockets['/custom-props-web-socket'];
    });
});
