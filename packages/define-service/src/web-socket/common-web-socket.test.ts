import {describe, it} from '@augment-vir/test';
import type WsWebSocket from 'ws';
import {CommonWebSocket} from './common-web-socket.js';

describe(CommonWebSocket.name, () => {
    it('is assignable to from both client and server WebSockets', () => {
        const wsTest: CommonWebSocket = {} as any as WsWebSocket;

        const webTest: CommonWebSocket = {} as any as globalThis.WebSocket;
    });
    it('cannot be constructed in typescript', () => {
        // @ts-expect-error: this is an abstract class and cannot be constructed
        // eslint-disable-next-line sonarjs/constructor-for-side-effects
        new CommonWebSocket('url');
    });
});
