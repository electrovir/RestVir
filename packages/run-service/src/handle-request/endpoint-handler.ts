/* node:coverage disable: this file is just types */

import {type HttpStatus, type MaybePromise, type PartialWithUndefined} from '@augment-vir/common';
import {
    ServerRequest,
    ServerResponse,
    type ImplementedEndpoint,
    type ImplementedWebSocket,
} from '@rest-vir/implement-service';
import {OutgoingHttpHeaders} from 'node:http';
import {setResponseHeaders} from '../util/headers.js';

/**
 * Options for `handleRoute`.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type HandleRouteOptions = PartialWithUndefined<{
    /**
     * If set to `true`, all service endpoint handlers will throw their errors, allowing your
     * existing server setup to catch them and handle them as you wish.
     *
     * If set to `false`, all service endpoint handlers will handle the errors internally to prevent
     * accidentally leaking error messages to the frontend.
     *
     * @default false
     */
    throwErrorsForExternalHandling: boolean;
}>;

/**
 * Output from {@link EndpointHandler}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type HandledOutput =
    | {
          body?: never;
          statusCode?: never;
          headers?: Readonly<OutgoingHttpHeaders> | undefined;
          error?: Error | undefined;
      }
    | {
          body?: unknown;
          /**
           * If this is set, then the response is sent with this status code and the given body (if
           * any).
           */
          statusCode: HttpStatus;
          headers?: Readonly<OutgoingHttpHeaders> | undefined;
          error?: Error | undefined;
      }
    /** A value of `undefined` indicates that the response should not be sent yet. */
    | undefined;

/**
 * Params for {@link EndpointHandler}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type EndpointHandlerParams = {
    request: ServerRequest;
    response: ServerResponse;
    route: Readonly<ImplementedEndpoint | ImplementedWebSocket>;
};

/**
 * An individual endpoint handler. The complete endpoint handler is made up of multiple of these.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type EndpointHandler = (
    params: Readonly<EndpointHandlerParams>,
) => MaybePromise<HandledOutput>;

/**
 * Handle the output of a handler. Setting headers, sending the response, etc.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function handleHandlerResult(
    result: Readonly<HandledOutput>,
    response: ServerResponse,
): {responseSent: boolean} {
    if (result?.headers) {
        setResponseHeaders(response, result.headers);
    }

    if (result?.statusCode) {
        response.statusCode = result.statusCode;

        if (result.body) {
            response.send(result.body);
        } else {
            response.send();
        }

        return {
            responseSent: true,
        };
    }

    return {
        responseSent: false,
    };
}
