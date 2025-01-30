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
export type EndpointRequest = FastifyRequest;

/**
 * A type alias for the response objects used by rest-vir. Currently this is the `FastifyReply`
 * object from Fastify.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointResponse = FastifyReply;

/**
 * A type alias for the web socket objects used by rest-vir. Currently this is the `WebSocket`
 * object from the ws package.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type WebSocket = WsWebSocket;
