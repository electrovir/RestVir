import {ensureErrorClass, extractErrorMessage, stringify} from '@augment-vir/common';
import {
    overwriteWebSocketMethods,
    parseJsonWithUndefined,
    WebSocketLocation,
} from '@rest-vir/define-service';
import {
    ImplementedWebSocket,
    RestVirHandlerError,
    ServerRequest,
} from '@rest-vir/implement-service';
import {assertValidShape} from 'object-shape-tester';
import {type WebSocket as WsWebSocket} from 'ws';

/**
 * Handles a WebSocket request.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function handleWebSocketRequest(
    this: void,
    {
        attachId,
        request,
        socket,
        webSocket: wsWebSocket,
    }: Readonly<{
        request: ServerRequest;
        attachId: string;
        socket: Readonly<ImplementedWebSocket>;
        webSocket: WsWebSocket;
    }>,
) {
    const restVirContext = request.restVirContext?.[attachId];

    const protocols: string[] = (request.headers['sec-websocket-protocol'] || '').split(', ');

    const webSocket = overwriteWebSocketMethods(socket, wsWebSocket, WebSocketLocation.OnHost);

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
                socket.service.logger.error(
                    ensureErrorClass(
                        error,
                        RestVirHandlerError,
                        socket,
                        extractErrorMessage(error),
                    ),
                );
            }
        });
    }

    if (socket.implementation.onConnection) {
        await socket.implementation.onConnection(socketCallbackParams);
    }
}
