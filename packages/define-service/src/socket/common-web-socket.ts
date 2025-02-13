import type {AnyFunction} from '@augment-vir/common';

export abstract class CommonWebSocket {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(url: string | URL, protocols?: string | string[]) {}
    public abstract send: (data: any) => void;
    public abstract readyState: CommonWebSocketState;
    public abstract addEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: (event: CommonWebSocketEventMap[EventName]) => void,
        options?: CommonWebSocketListenerOptions,
    ): void;
    public abstract removeEventListener<const EventName extends keyof CommonWebSocketEventMap>(
        eventName: EventName,
        listener: AnyFunction,
    ): void;
    public abstract close(): void;
}

export type CommonWebSocketListenerOptions = {
    once?: boolean;
};

export enum CommonWebSocketState {
    Connecting = 0,
    Open = 1,
    Closing = 2,
    Closed = 3,
}

export type CommonWebSocketEventMap = {
    open: {
        target: CommonWebSocket;
        type: string;
    };
    error: {
        target: CommonWebSocket;
        type: string;
    };
    close: {
        code: number;
        reason: string;
        wasClean: boolean;
        target: CommonWebSocket;
        type: string;
    };
    message: {
        data: unknown;
        target: CommonWebSocket;
        type: string;
    };
};
