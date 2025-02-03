import {ensureErrorClass, extractErrorMessage, wrapInTry} from '@augment-vir/common';
import {NoParam} from '@rest-vir/define-service';
import {
    ImplementedSocket,
    RestVirHandlerError,
    ServerRequest,
    ServerWebSocket,
} from '@rest-vir/implement-service';
import {assertValidShape} from 'object-shape-tester';

export async function handleSocketRequest(
    this: void,
    {
        attachId,
        request,
        socket,
        webSocket,
    }: Readonly<{
        request: ServerRequest;
        attachId: string;
        socket: Readonly<ImplementedSocket>;
        webSocket: ServerWebSocket<NoParam>;
    }>,
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
                    socket.messageFromClientShape,
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
