import {log, mapObjectValues, type PartialWithUndefined} from '@augment-vir/common';
import {InternalEndpointError} from './endpoint.error.js';

/**
 * A service logger. All internal service logs will go through this and endpoint implementations are
 * also given the service's logger to use if they wish.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServiceLogger = {
    /** The error log is always guaranteed to be passed exactly a single error. */
    error: (error: Error) => void;
    /**
     * The info log maybe receive any number of arguments of any type. Note that
     * {@link defaultServiceLogger} already contains logic to convert these into strings so you may
     * want to utilize its behavior in your custom logging.
     */
    info: (...args: ReadonlyArray<unknown>) => void;
};

/**
 * User-definable service logger. Loggers may be set as `undefined` here to silence them.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ServiceLoggerOption = PartialWithUndefined<ServiceLogger>;

/**
 * The efault service logger.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export const defaultServiceLogger: ServiceLogger = {
    error(error) {
        if (error instanceof InternalEndpointError) {
            log.error(error.message);
        } else {
            log.error(error);
        }
    },
    info: log.faint,
};

/**
 * Combines a user defined service logger with the default logger, silencing loggers that have been
 * set to `undefined` by the user.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function createServiceLogger(option: ServiceLoggerOption = {}): ServiceLogger {
    return mapObjectValues(defaultServiceLogger, (logKey, defaultLogFunction) => {
        if (logKey in option) {
            return option[logKey] || silentServiceLogger[logKey];
        } else {
            return defaultLogFunction;
        }
    }) as ServiceLogger;
}

/**
 * A silent service logger. All logs simply do not get logged or do anything at all.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export const silentServiceLogger: ServiceLogger = {
    error: () => {},
    info: () => {},
};
