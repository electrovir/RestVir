import {getOrSet, type AnyObject, type PartialWithUndefined} from '@augment-vir/common';
import {
    CommonWebSocket,
    CommonWebSocketEventMap,
    CommonWebSocketState,
} from '../web-socket/common-web-socket.js';
import {type ClientWebSocket} from '../web-socket/overwrite-web-socket-methods.js';
import {WebSocketDefinition} from '../web-socket/web-socket-definition.js';

export type MockClientWebSocketClientSendCallback<WebSocketToConnect extends WebSocketDefinition> =
    (
        webSocket: ClientWebSocket<WebSocketToConnect, MockClientWebSocket<WebSocketToConnect>>,
        data: WebSocketToConnect['MessageFromClientType'],
    ) => void;

export class MockClientWebSocket<const WebSocketToConnect extends WebSocketDefinition>
    implements CommonWebSocket
{
    public listeners: Partial<{
        [EventName in keyof CommonWebSocketEventMap]: Set<
            (event: CommonWebSocketEventMap[EventName]) => void
        >;
    }> = {};

    /** This is called whenever this WebSocket's `.send()` method is called. */
    public sendCallback: MockClientWebSocketClientSendCallback<WebSocketToConnect> | undefined;

    constructor(
        options: PartialWithUndefined<{
            /**
             * Set this to `true` if you want to prevent this mock WebSocket from immediately opening
             * itself. You can then use `.open()` at any time to manually open it.
             */
            preventImmediateOpen: boolean;
        }> = {},
    ) {
        if (!options.preventImmediateOpen) {
            this.open();
        }
    }

    public open() {
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

    public sendFromServer(data: WebSocketToConnect['MessageFromHostType']) {
        this.dispatchEvent('message', {
            data,
        });
    }
}
