import {extractErrorMessage, SelectFrom} from '@augment-vir/common';
import {type Endpoint} from '@rest-vir/define-service';
import {InternalEndpointError} from '@rest-vir/implement-service';
import {assertValidShape} from 'object-shape-tester';

/**
 * Attempts to extract expected request data from the given request.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @returns The parsed `EndpointRequest` body
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function extractRequestData(
    body: unknown,
    endpoint: Readonly<
        SelectFrom<
            Endpoint,
            {
                requestDataShape: true;
                endpointPath: true;
                service: {serviceName: true};
            }
        >
    >,
): unknown {
    try {
        const requestDataShape = endpoint.requestDataShape;

        if (!requestDataShape) {
            if (body) {
                throw new Error(`Did not expect any request data but received it.`);
            } else {
                return undefined;
            }
        }

        assertValidShape(body, requestDataShape, {
            /** Allow extra keys for forwards / backwards compatibility. */
            allowExtraKeys: true,
        });

        return body;
    } catch (error) {
        throw new InternalEndpointError(endpoint, extractErrorMessage(error));
    }
}
