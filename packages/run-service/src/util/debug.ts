import {defaultServiceLogger, type GenericServiceImplementation} from '@rest-vir/implement-service';

/**
 * When debug is set to `true`, this overwrites the service's logger to {@link defaultServiceLogger}.
 *
 * WARNING: this mutates the input `service` object.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function applyDebugLogger(
    debug: undefined | boolean,
    service: Pick<GenericServiceImplementation, 'logger'>,
) {
    if (!debug) {
        return;
    }

    service.logger = defaultServiceLogger;
}
