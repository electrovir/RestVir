import {type IncomingHttpHeaders} from 'node:http';

/**
 * The bare minimum Response object type needed for rest-vir to function.
 *
 * This type is used to maximize flexibility between different server providers (like express or
 * hyper-express).
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type MinimalRequest = {
    headers: IncomingHttpHeaders;
    method: string;
    body: unknown;
};
