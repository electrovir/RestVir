import {check} from '@augment-vir/assert';
import {type AtLeastTuple, stringify} from '@augment-vir/common';
import {ServiceDefinitionError} from './service-definition.error.js';

/**
 * Base type used for the right side of "extends" in type parameters for AuthRoleEnum tuples.
 *
 * @category Internal
 */
export type BaseEndpointRequiredAuth<AllowedAuthEntries> =
    | undefined
    | Readonly<AtLeastTuple<AllowedAuthEntries, 1>>;

/**
 * Asserts that the given required endpoint aut is valid.
 *
 * @category Internal
 * @throws {@link ServiceDefinitionError} : if there is an issue
 */
export function assertValidEndpointAuth<
    /**
     * This will be provided from the user for the service as a whole. This is a union or enum of
     * all possible auth values, which `requiredEndpointAuth` must be a subset of.
     */
    AllowedAuthEntries,
>({
    requiredEndpointAuth,
    allowedAuth,
    endpointPath,
    serviceName,
}: Readonly<{
    requiredEndpointAuth: BaseEndpointRequiredAuth<AllowedAuthEntries>;
    allowedAuth: Readonly<AtLeastTuple<AllowedAuthEntries, 1>> | undefined;
    endpointPath: string;
    serviceName: string;
}>) {
    if (requiredEndpointAuth === undefined) {
        return;
    } else if (!allowedAuth) {
        throw new ServiceDefinitionError({
            endpointPath,
            serviceName,
            errorMessage:
                'Cannot define an endpoint with required auth with no allowed service auth.',
        });
    } else if (!requiredEndpointAuth.length) {
        throw new ServiceDefinitionError({
            endpointPath,
            serviceName,
            errorMessage: 'Cannot define an endpoint with an empty required auth array.',
        });
    }

    const invalidAuthRoles = requiredEndpointAuth.filter(
        (requiredAuthEntry) =>
            !allowedAuth.some((allowedAuthEntry) =>
                check.deepEquals(allowedAuthEntry, requiredAuthEntry),
            ),
    );

    if (invalidAuthRoles.length) {
        throw new ServiceDefinitionError({
            endpointPath,
            serviceName,
            errorMessage: `Invalid required endpoint auth: ${stringify(invalidAuthRoles)}`,
        });
    }
}
