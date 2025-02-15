import {ensureErrorClass, extractErrorMessage, log, stringify} from '@augment-vir/common';
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
import {HandleRouteOptions} from './endpoint-handler.js';

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
        implementedWebSocket,
        webSocket: wsWebSocket,
    }: Readonly<{
        request: ServerRequest;
        attachId: string;
        implementedWebSocket: Readonly<ImplementedWebSocket>;
        webSocket: WsWebSocket;
    }>,
    options: Readonly<HandleRouteOptions> = {},
) {
    const restVirContext = request.restVirContext?.[attachId];

    const webSocket = overwriteWebSocketMethods(
        implementedWebSocket,
        wsWebSocket,
        WebSocketLocation.OnHost,
    );

    const webSocketCallbackParams = {
        context: restVirContext?.context,
        headers: request.headers,
        log: implementedWebSocket.service.logger,
        request,
        service: implementedWebSocket.service,
        webSocketDefinition: implementedWebSocket,
        webSocket,
        protocols: restVirContext?.protocols,
    };

    if (implementedWebSocket.implementation.onClose) {
        webSocket.on('close', async () => {
            await implementedWebSocket.implementation.onClose?.(webSocketCallbackParams);
        });
    }

    if (implementedWebSocket.implementation.onMessage) {
        webSocket.on('message', async (rawMessage) => {
            let message: unknown;
            try {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                const stringRawMessage = String(rawMessage);

                message = parseJsonWithUndefined(stringRawMessage);

                if (implementedWebSocket.messageFromClientShape) {
                    assertValidShape(
                        message,
                        implementedWebSocket.messageFromClientShape,
                        {allowExtraKeys: true},
                        'Invalid message send shape.',
                    );
                } else if (message) {
                    throw new Error(
                        `Did not expect any data from the client but got ${stringify(message)}.`,
                    );
                }
            } catch (error) {
                const errorMessage = `Failed to receive WebSocket message '${String(rawMessage as unknown)}': ${extractErrorMessage(error)}`;

                log.if(!!options.debug).error(errorMessage);
                implementedWebSocket.service.logger.error(
                    ensureErrorClass(
                        error,
                        RestVirHandlerError,
                        implementedWebSocket,
                        errorMessage,
                    ),
                );
            }
            try {
                await implementedWebSocket.implementation.onMessage?.({
                    ...webSocketCallbackParams,
                    message,
                });
            } catch (error) {
                implementedWebSocket.service.logger.error(
                    ensureErrorClass(
                        error,
                        RestVirHandlerError,
                        implementedWebSocket,
                        `Failed to handle WebSocket message '${String(rawMessage as unknown)}': ${extractErrorMessage(error)}`,
                    ),
                );
            }
        });
    }

    if (implementedWebSocket.implementation.onConnection) {
        await implementedWebSocket.implementation.onConnection(webSocketCallbackParams);
    }
}
