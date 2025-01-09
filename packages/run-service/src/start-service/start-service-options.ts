import {
    mergeDefinedProperties,
    type PartialWithUndefined,
    type SetRequiredAndNotNull,
} from '@augment-vir/common';
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
     */
    port: -1,
    /**
     * The number of workers to split the server into (for parallel request handling).
     *
     * @default cpus().length - 1
     */
    workerCount: cpus().length - 1,
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
export type StartServiceUserOptions = SetRequiredAndNotNull<
    PartialWithUndefined<StartServiceOptions>,
    'port'
>;

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
