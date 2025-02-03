import {getObjectTypedEntries} from '@augment-vir/common';
import {type ServerResponse} from '@rest-vir/implement-service';
import {type OutgoingHttpHeaders} from 'node:http';

/**
 * Easily apply an object of headers to a Response object. Setting a header to `undefined` removes
 * it.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function setResponseHeaders(
    response: /**
     * This is a subset of the fastify response type, but without a return type that makes ESLint think
     * that these methods are async (by default it returns the original Fastify reply object which
     * matches PromiseLike and thus confuses ESLint.
     */
    Readonly<Pick<ServerResponse, 'removeHeader' | 'header'>>,
    headers: Readonly<OutgoingHttpHeaders>,
): void {
    getObjectTypedEntries(headers).forEach(
        ([
            name,
            value,
        ]) => {
            if (value == undefined) {
                response.removeHeader(String(name));
            } else {
                response.header(String(name), value);
            }
        },
    );
}
