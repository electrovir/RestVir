import {describe, it} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import type {WebSocketDefinition} from './web-socket-definition.js';

describe('WebSocketDefinition', () => {
    it('is assignable to from any WebSocket definition', () => {
        const genericWebSocket: WebSocketDefinition =
            mockService.webSockets['/custom-props-web-socket'];
    });
});
