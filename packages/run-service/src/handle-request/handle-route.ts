import {assert, check} from '@augment-vir/assert';
import {ensureError, HttpStatus} from '@augment-vir/common';
import {
    ImplementedEndpoint,
    RestVirHandlerError,
    ServerRequest,
    ServerResponse,
    type ImplementedSocket,
} from '@rest-vir/implement-service';
import cluster from 'node:cluster';
import {type WebSocket as WsWebSocket} from 'ws';
import {handleHandlerResult} from './endpoint-handler.js';
import {handleEndpointRequest} from './handle-endpoint.js';
import {handleSocketRequest} from './handle-socket.js';

/**
 * Options for {@link handleRoute}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type HandleRouteOptions = Partial<{
    /**
     * If set to `true`, all service endpoint handlers will throw any errors, allowing your existing
     * server setup to catch them and handle them as you wish.
     *
     * If set to `false`, all service endpoint handlers will handle the errors internally to prevent
     * accidentally leaking error messages to the frontend.
     *
     * @default `false`
     */
    throwErrorsForExternalHandling: boolean;
}>;

/**
 * Handles a WebSocket or Endpoint request.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function handleRoute(
    /** Endpoint requests won't have a `WebSocket`. */
    webSocket: WsWebSocket | undefined,
    request: ServerRequest,
    /** `WebSocket` requests won't have a response. */
    response: ServerResponse | undefined,
    route: Readonly<ImplementedEndpoint | ImplementedSocket>,
    attachId: string,
    {throwErrorsForExternalHandling}: HandleRouteOptions = {},
) {
    try {
        const workerPid = cluster.isPrimary ? '' : process.pid;
        const webSocketMarker = route.socket ? '(ws)' : '';

        const logParts = [
            workerPid,
            request.method,
            webSocketMarker,
            request.originalUrl,
        ].filter(check.isTruthy);
        route.service.logger.info(logParts.join('\t'));

        if (route.endpoint) {
            assert.isDefined(response);

            const result = await handleEndpointRequest({
                request,
                response,
                endpoint: route,
                attachId,
            });

            if (handleHandlerResult(result, response).responseSent) {
                return;
            }
        } else if (route.socket as boolean) {
            assert.isDefined(webSocket);

            await handleSocketRequest({
                request,
                socket: route,
                webSocket,
                attachId,
            });

            return;
        }

        /* node:coverage ignore next: cover a potential future edge case. */
        throw new RestVirHandlerError(route, 'Request was not handled.');
    } catch (error) {
        route.service.logger.error(ensureError(error));
        if (throwErrorsForExternalHandling) {
            throw error;
        } else if (response && !response.sent) {
            response.statusCode = HttpStatus.InternalServerError;
            response.send();
        }
    }
}
