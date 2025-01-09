import type {MaybePromise} from '@augment-vir/common';
import {Endpoint} from '@rest-vir/define-service';
import type {
    EndpointRequest,
    EndpointResponse,
    ServiceImplementation,
} from '@rest-vir/implement-service';

/**
 * Output from {@link EndpointHandler}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type HandledOutput = {
    /**
     * - `true`: indicates that the response was sent and endpoint handling should cease.
     * - `false` indicates that the response was successfully handled but not yet sent and further
     *   handling should continue.
     */
    handled: boolean;
};

/**
 * An individual endpoint handler. The complete endpoint handler is made up of multiple of these.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @returns `true` if the response has been sent.
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type EndpointHandler = (
    request: Readonly<EndpointRequest>,
    response: Readonly<EndpointResponse>,
    endpoint: Readonly<Endpoint>,
    service: Readonly<ServiceImplementation>,
) => MaybePromise<HandledOutput>;
