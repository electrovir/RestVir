import {ensureErrorClass, extractErrorMessage, stringify} from '@augment-vir/common';
import {
    type NoParam,
    overwriteWebSocketSend,
    parseJsonWithUndefined,
} from '@rest-vir/define-service';
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

    const protocols: string[] = (request.headers['sec-websocket-protocol'] || '').split(', ');

    overwriteWebSocketSend(socket, webSocket, 'in-server');

    const socketCallbackParams = {
        context: restVirContext?.context,
        headers: request.headers,
        log: socket.service.logger,
        request,
        service: socket.service,
        socketDefinition: socket,
        webSocket,
        protocols,
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

                const message = parseJsonWithUndefined(stringRawMessage);

                if (socket.messageFromClientShape) {
                    assertValidShape(
                        message,
                        socket.messageFromClientShape,
                        {allowExtraKeys: true},
                        'Invalid message send shape.',
                    );
                } else if (message) {
                    throw new Error(
                        `Did not expect any data from the client but got ${stringify(message)}.`,
                    );
                }

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
