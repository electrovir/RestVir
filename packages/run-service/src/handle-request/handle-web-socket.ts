import {assert} from '@augment-vir/assert';
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
    type WebSocketImplementationParams,
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
        implementedWebSocket,
        webSocket: wsWebSocket,
    }: Readonly<{
        request: ServerRequest;
        attachId: string;
        implementedWebSocket: Readonly<ImplementedWebSocket>;
        webSocket: WsWebSocket;
    }>,
) {
    const restVirContext = request.restVirContext?.[attachId];

    assert.isDefined(restVirContext, 'restVirContext is not defined');

    const webSocket = overwriteWebSocketMethods(
        implementedWebSocket,
        wsWebSocket,
        WebSocketLocation.OnHost,
    );

    const webSocketCallbackParams: WebSocketImplementationParams = {
        context: restVirContext.context,
        headers: request.headers,
        log: implementedWebSocket.service.logger,
        request,
        service: implementedWebSocket.service,
        webSocketDefinition: implementedWebSocket,
        webSocket,
        protocols: restVirContext.protocols,
        searchParams: restVirContext.searchParams,
    };

    if (implementedWebSocket.implementation.close) {
        webSocket.on('close', async () => {
            await implementedWebSocket.implementation.close?.(webSocketCallbackParams);
        });
    }

    if (implementedWebSocket.implementation.message) {
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
                await implementedWebSocket.implementation.message?.({
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

    if (implementedWebSocket.implementation.open) {
        await implementedWebSocket.implementation.open(webSocketCallbackParams);
    }
}
