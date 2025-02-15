import {assert, check} from '@augment-vir/assert';
import {ensureError, HttpStatus} from '@augment-vir/common';
import {
    ImplementedEndpoint,
    RestVirHandlerError,
    ServerRequest,
    ServerResponse,
    type ImplementedWebSocket,
} from '@rest-vir/implement-service';
import cluster from 'node:cluster';
import {type WebSocket as WsWebSocket} from 'ws';
import {handleHandlerResult, HandleRouteOptions} from './endpoint-handler.js';
import {handleEndpointRequest} from './handle-endpoint.js';
import {handleWebSocketRequest} from './handle-web-socket.js';

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
    route: Readonly<ImplementedEndpoint | ImplementedWebSocket>,
    attachId: string,
    options: Readonly<Pick<HandleRouteOptions, 'throwErrorsForExternalHandling'>> = {},
) {
    try {
        const workerPid = cluster.isPrimary ? '' : process.pid;
        const webSocketMarker = route.isWebSocket ? '(ws)' : '';

        const logParts = [
            workerPid,
            request.method,
            webSocketMarker,
            request.originalUrl,
        ].filter(check.isTruthy);
        route.service.logger.info(logParts.join('\t'));

        if (route.isEndpoint) {
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
        } else if (route.isWebSocket as boolean) {
            assert.isDefined(webSocket);

            await handleWebSocketRequest({
                request,
                implementedWebSocket: route,
                webSocket,
                attachId,
            });

            return;
        }

        /* node:coverage ignore next: this can't actually be triggered but it should be covered as a potential future edge case. */
        throw new RestVirHandlerError(route, 'Request was not handled.');
    } catch (error) {
        route.service.logger.error(ensureError(error));
        if (options.throwErrorsForExternalHandling) {
            throw error;
        } else if (response && !response.sent) {
            response.statusCode = HttpStatus.InternalServerError;
            response.send();
        }
    }
}
