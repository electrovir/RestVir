import {ensureErrorClass, extractErrorMessage, wrapInTry} from '@augment-vir/common';
import {
    RestVirHandlerError,
    type ImplementedSocket,
    type WebSocket,
} from '@rest-vir/implement-service';
import {assertValidShape} from 'object-shape-tester';
import {EndpointHandlerParams} from './endpoint-handler.js';

export async function handleSocketRequest(
    this: void,
    {
        attachId,
        request,
        socket,
        webSocket,
    }: Readonly<
        Pick<EndpointHandlerParams, 'request'> & {
            attachId: string;
            socket: Readonly<ImplementedSocket>;
            webSocket: WebSocket;
        }
    >,
) {
    const restVirContext = request.restVirContext?.[attachId];

    const socketCallbackParams = {
        context: restVirContext?.context,
        headers: request.headers,
        log: socket.service.logger,
        request,
        service: socket.service,
        socketDefinition: socket,
        webSocket,
    };

    if (socket.implementation.onClose) {
        webSocket.on('close', async () => {
            await socket.implementation.onClose?.(socketCallbackParams);
        });
    }

    if (socket.implementation.onMessage) {
        webSocket.on('message', async (rawMessage) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                const stringRawMessage = String(rawMessage);

                const message = wrapInTry(() => JSON.parse(stringRawMessage), {
                    fallbackValue: stringRawMessage,
                });

                assertValidShape(
                    message,
                    socket.messageDataShape,
                    {allowExtraKeys: true},
                    'Invalid message send shape.',
                );

                await socket.implementation.onMessage?.({
                    ...socketCallbackParams,
                    message,
                });
            } catch (error) {
                throw ensureErrorClass(
                    error,
                    RestVirHandlerError,
                    socket,
                    extractErrorMessage(error),
                );
            }
        });
    }

    if (socket.implementation.onConnection) {
        await socket.implementation.onConnection(socketCallbackParams);
    }
}
