import {CollapsedFetchEndpointParams, EndpointDefinition} from '@rest-vir/define-service';
import {type ImplementedEndpoint} from '@rest-vir/implement-service';
import {testService} from './test-service.js';

/**
 * The type definition for {@link testEndpoint}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type TestEndpoint = <EndpointToTest extends EndpointDefinition>(
    endpoint: EndpointToTest,
    ...args: CollapsedFetchEndpointParams<EndpointToTest, false>
) => Promise<Response>;

/**
 * Test your endpoint with real Request and Response objects!
 *
 * @category Testing : Backend
 * @category Package : @rest-vir/run-service
 * @example
 *
 * ```ts
 * import {testEndpoint} from '@rest-vir/run-service';
 *
 * const response = await testEndpoint(myServiceImplementation.endpoints['/my-endpoint']);
 * ```
 *
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export const testEndpoint = async function testEndpoint<
    const EndpointToTest extends ImplementedEndpoint,
>(endpoint: EndpointToTest, ...args: CollapsedFetchEndpointParams<EndpointToTest, false>) {
    const {fetchEndpoint, kill} = await testService(
        {
            ...endpoint.service,
            endpoints: {
                [endpoint.path]: endpoint,
            },
            webSockets: {},
        },
        {
            debug: true,
        },
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await fetchEndpoint[endpoint.path]!(...args);

    await kill();

    return response;
} as TestEndpoint;
