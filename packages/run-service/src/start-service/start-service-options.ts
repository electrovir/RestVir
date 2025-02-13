import {mergeDefinedProperties, type PartialWithUndefined} from '@augment-vir/common';
import {cpus} from 'node:os';
import {assertValidShape, defineShape} from 'object-shape-tester';

/**
 * Shape definition for `startService` options.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export const startServiceOptionsShape = defineShape({
    /**
     * Prevent automatically choosing an available port if the provided port is already in use. This
     * will cause `startService` to simply crash if the given port is in use.
     *
     * @default false
     */
    lockPort: false,
    /**
     * The port that the service should listen to requests on. Note that if `lockPort` is not set,
     * `startService` will try to find the first available port _starting_ with this given `port`
     * property (so the actual server may be listening to a different port).
     *
     * If this property is set to `false`, no port will be listened to (so you can manually do that
     * later if you wish).
     *
     * @default 3000
     */
    port: 3000,
    /**
     * The number of workers to split the server into (for parallel request handling).
     *
     * @default cpus().length - 1
     */
    workerCount: cpus().length - 1,
    /**
     * The host name that the server should listen to. In most cases this doesn't need to be set.
     *
     * @default 'localhost'
     */
    host: 'localhost',
    /**
     * If set to `true`, a multi-threaded service (`workerCount` > 1) will not automatically respawn
     * its workers. This has no effect on single-threaded services (`workerCount` == 1).
     *
     * @default false
     */
    preventWorkerRespawn: false,
});

/**
 * Full options type for `startService`.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type StartServiceOptions = typeof startServiceOptionsShape.runtimeType;

/**
 * User-provided options type for `startService`.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 * @see {@link startServiceOptionsShape} for option explanations.
 */
export type StartServiceUserOptions = PartialWithUndefined<StartServiceOptions>;

/**
 * Combines user defined options with default options to create a full options type for
 * `startService`.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 * @see {@link startServiceOptionsShape} for option explanations.
 */
export function finalizeOptions(
    userOptions: Readonly<StartServiceUserOptions>,
): StartServiceOptions {
    const options = mergeDefinedProperties<StartServiceOptions>(
        startServiceOptionsShape.defaultValue,
        userOptions,
    );
    options.workerCount = Math.max(1, options.workerCount);

    assertValidShape(options, startServiceOptionsShape);

    return options;
}
