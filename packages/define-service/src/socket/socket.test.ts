import {describe, it} from '@augment-vir/test';
import {mockService} from '../service/define-service.mock.js';
import type {Socket} from './socket.js';

describe('Socket', () => {
    it('is assignable to from any socket definition', () => {
        const genericSocket: Socket = mockService.sockets['/custom-props-socket'];
    });
});
