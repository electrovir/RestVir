import {check} from '@augment-vir/assert';
import {HttpMethod, SelectFrom} from '@augment-vir/common';
import {
    AnyOrigin,
    Endpoint,
    getAllowedEndpointMethods,
    OriginRequirement,
} from '@rest-vir/define-service';
import {HttpStatus, InternalEndpointError} from '@rest-vir/implement-service';
import {convertDuration} from 'date-vir';
import type {OutgoingHttpHeaders} from 'node:http';
import {EndpointHandlerParams, HandledOutput} from '../endpoint-handler.js';

/**
 * Determines the required origin for the endpoint and compares it with the given request.
 *
 * If an OPTIONS request is being handled, a `NoContent` response is always sent, with all CORS
 * headers set appropriately.
 *
 * For other requests:
 *
 * - If the request fails the origin checks, a `Forbidden` response is sent.
 * - If the request passes origin checks, the appropriate CORS headers are set and a response is not
 *   sent (so further handlers can process it).
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function handleCors(
    this: void,
    {
        endpoint,
        request,
    }: Readonly<
        SelectFrom<
            EndpointHandlerParams,
            {
                request: {
                    headers: true;
                    method: true;
                };
                endpoint: {
                    requiredOrigin: true;
                    endpointPath: true;
                    service: {
                        serviceName: true;
                        requiredOrigin: true;
                    };
                    methods: true;
                };
            }
        >
    >,
): Promise<HandledOutput> {
    const origin = request.headers.origin;
    const matchedOrigin = await matchOrigin(endpoint, origin);
    const allowedMethods = getAllowedEndpointMethods(endpoint);

    if (request.method.toUpperCase() === HttpMethod.Options) {
        return {
            statusCode: HttpStatus.NoContent,
            headers: buildOptionsRequestCorsHeaders(matchedOrigin, allowedMethods),
        };
    } else if (matchedOrigin) {
        return {
            headers: buildStandardCorsHeaders(matchedOrigin),
        };
    } else {
        /** The CORS requirements for this request have not been met. */
        return {
            statusCode: HttpStatus.Forbidden,
        };
    }
}

function buildStandardCorsHeaders(matchedOrigin: NonNullable<MatchedOrigin>): OutgoingHttpHeaders {
    if (matchedOrigin === AnyOrigin) {
        return {
            'Access-Control-Allow-Origin': '*',
        };
    } else {
        return {
            'Access-Control-Allow-Origin': matchedOrigin,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin',
        };
    }
}

const accessControlMaxAgeValue: string = String(
    convertDuration({hours: 1}, {seconds: true}).seconds,
);

const contentLengthHeaders = {
    /**
     * Safari (and potentially other browsers) need content-length 0 for 204 or it will hang waiting
     * for a body.
     */
    'Content-Length': '0',
};

function buildOptionsRequestCorsHeaders(
    matchedOrigin: MatchedOrigin,
    allowedMethods: HttpMethod[],
): OutgoingHttpHeaders {
    if (matchedOrigin == undefined) {
        return contentLengthHeaders;
    }

    return {
        ...buildStandardCorsHeaders(matchedOrigin),
        'Access-Control-Allow-Methods': allowedMethods.join(','),
        'Access-Control-Allow-Headers': [
            'Cookie',
            'Authorization',
            'Content-Type',
        ].join(','),
        'Access-Control-Max-Age': accessControlMaxAgeValue,

        ...contentLengthHeaders,
    };
}

/**
 * The possible types here should be used for the following:
 *
 * - `string`: should be the valid origin that matches the request origin
 * - `undefined`: should be used when the request origin is not valid and thus should be rejected.
 * - `AnyOrigin`: should be used when the endpoint accepts any origin.
 */
type MatchedOrigin = string | undefined | AnyOrigin;

async function matchOrigin(
    endpoint: Readonly<
        SelectFrom<
            Endpoint,
            {
                requiredOrigin: true;
                endpointPath: true;
                service: {
                    serviceName: true;
                    requiredOrigin: true;
                };
            }
        >
    >,
    origin: string | undefined,
): Promise<MatchedOrigin> {
    const endpointRequirement = await checkOriginRequirement(endpoint.requiredOrigin, origin);

    if (endpointRequirement === AnyOrigin) {
        return AnyOrigin;
    } else if (endpointRequirement === false) {
        return undefined;
    } else if (endpointRequirement === true) {
        return origin;
    }

    /** If the endpoint requirement is `undefined`, then we check the service requirement. */

    const serviceRequirement = await checkOriginRequirement(
        endpoint.service.requiredOrigin,
        origin,
    );

    if (serviceRequirement === AnyOrigin) {
        return AnyOrigin;
    } else if (serviceRequirement === false) {
        return undefined;
    } else if (serviceRequirement === true) {
        return origin;
    }

    /**
     * If the service requirement is `undefined`, something went wrong because service definitions
     * are not allowed to have an `undefined` origin requirement.
     */
    throw new InternalEndpointError(
        endpoint,
        `Request origin '${origin}' failed to get checked for endpoint '${endpoint.endpointPath}' or service '${endpoint.service.serviceName}'`,
    );
}

/**
 * - `boolean`: the origin was explicitly checked and passed (`true`) or failed (`false`)
 * - `undefined`: no origin checking occurred
 * - `AnyOrigin`: requirements explicitly allow any origin.
 */
type OriginRequirementResult = boolean | undefined | AnyOrigin;

async function checkOriginRequirement(
    originRequirement: OriginRequirement,
    origin: string | undefined,
): Promise<OriginRequirementResult> {
    if (originRequirement === AnyOrigin) {
        /** Any origin has been explicitly allowed. */
        return AnyOrigin;
    } else if (originRequirement === undefined) {
        /** No checking occurred. */
        return undefined;
    } else if (!origin) {
        /** If there is an origin requirement but no origin then the origin automatically fails. */
        return false;
    } else if (check.isString(originRequirement)) {
        return origin === originRequirement;
    } else if (check.instanceOf(originRequirement, RegExp)) {
        return !!originRequirement.exec(origin);
    } else if (check.isArray(originRequirement)) {
        for (const requirement of originRequirement) {
            if (await checkOriginRequirement(requirement, origin)) {
                return true;
            }
        }
        return false;
    } else {
        return await originRequirement(origin);
    }
}
