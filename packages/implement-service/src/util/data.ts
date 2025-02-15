import {
    type NoParam,
    type OverwriteWebSocketMethods,
    type WebSocketDefinition,
    type WebSocketLocation,
} from '@rest-vir/define-service';
import {type FastifyReply, type FastifyRequest} from 'fastify';
import {type WebSocket as WsWebSocket} from 'ws';

/**
 * A type alias for the request objects used by rest-vir. Currently this is the `FastifyRequest`
 * object from Fastify.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServerRequest = FastifyRequest;

/**
 * A type alias for the response objects used by rest-vir. Currently this is the `FastifyReply`
 * object from Fastify.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServerResponse = FastifyReply;

/**
 * A type alias for the WebSocket objects used by rest-vir. Currently this is the `WebSocket` object
 * from the ws package.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServerWebSocket<SpecificWebSocket extends WebSocketDefinition | NoParam> =
    OverwriteWebSocketMethods<WsWebSocket, WebSocketLocation.OnHost, SpecificWebSocket>;
