/* node:coverage disable: this file is just types */

import type {HttpStatus, MaybePromise} from '@augment-vir/common';
import {Endpoint} from '@rest-vir/define-service';
import {
    EndpointRequest,
    EndpointResponse,
    GenericServiceImplementation,
} from '@rest-vir/implement-service';
import {OutgoingHttpHeaders} from 'node:http';

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
          headers?: Readonly<OutgoingHttpHeaders>;
          error?: Error;
      }
    | {
          body?: unknown;
          /**
           * If this is set, then the response is sent with this status code and the given body (if
           * any).
           */
          statusCode: HttpStatus;
          headers?: Readonly<OutgoingHttpHeaders>;
          error?: Error;
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
    request: EndpointRequest;
    response: EndpointResponse;
    endpoint: Readonly<Endpoint>;
    service: Readonly<GenericServiceImplementation>;
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
