import {getOrSet, type AnyObject} from '@augment-vir/common';
import {
    CommonWebSocket,
    CommonWebSocketEventMap,
    CommonWebSocketState,
} from '../socket/common-web-socket.js';
import {type ClientWebSocket} from '../socket/overwrite-socket-methods.js';
import {Socket} from '../socket/socket.js';

export type MockClientWebSocketClientSendCallback<SocketToConnect extends Socket> = (
    webSocket: ClientWebSocket<SocketToConnect, MockClientWebSocket<SocketToConnect>>,
    data: SocketToConnect['MessageFromClientType'],
) => void;

export class MockClientWebSocket<const SocketToConnect extends Socket> implements CommonWebSocket {
    public listeners: Partial<{
        [EventName in keyof CommonWebSocketEventMap]: Set<
            (event: CommonWebSocketEventMap[EventName]) => void
        >;
    }> = {};

    /** This is called whenever this WebSocket's `.send()` method is called. */
    public sendCallback: MockClientWebSocketClientSendCallback<SocketToConnect> | undefined;

    constructor() {
        setTimeout(() => {
            if (this.readyState === CommonWebSocketState.Connecting) {
                this.readyState = CommonWebSocketState.Open;
                this.dispatchEvent('open', {});
            }
        });
    }

    public close() {
        this.dispatchEvent('close', {
            code: 0,
            reason: 'manually closed',
            wasClean: true,
        });
        this.listeners = {};
        this.readyState = CommonWebSocketState.Closed;
    }

    public dispatchEvent<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        event: Omit<CommonWebSocketEventMap[EventName], 'type' | 'target'>,
    ) {
        this.listeners[eventName]?.forEach((listener) =>
            listener({
                ...event,
                target: this,
                type: eventName,
            } as AnyObject as CommonWebSocketEventMap[EventName]),
        );
    }

    public addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: (event: CommonWebSocketEventMap[EventName]) => void,
    ): void {
        getOrSet(this.listeners, eventName, () => new Set<any>()).add(listener as any);
    }
    public readyState: CommonWebSocketState = CommonWebSocketState.Connecting;
    public removeEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: (event: CommonWebSocketEventMap[EventName]) => void,
    ): void {
        this.listeners[eventName]?.delete(listener);
    }
    public send(data: any): void {
        this.sendCallback?.(this as any, data);
    }

    public sendFromServer(data: SocketToConnect['MessageFromHostType']) {
        this.dispatchEvent('message', {
            data,
        });
    }
}
