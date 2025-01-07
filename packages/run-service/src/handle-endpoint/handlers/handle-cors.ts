import {check} from '@augment-vir/assert';
import {
    AnyOrigin,
    Endpoint,
    getAllowedEndpointMethods,
    HttpMethod,
    OriginRequirement,
} from '@rest-vir/define-service';
import {HttpStatus} from '@rest-vir/implement-service';
import {convertDuration} from 'date-vir';
import {Request, Response} from 'express';
import {HeadersToSet, setResponseHeaders} from '../../util/headers.js';
import {HandledOutput} from '../endpoint-handler.js';
import {EndpointError} from '../endpoint.error.js';

export async function handleCors(
    this: void,
    request: Readonly<Request>,
    response: Readonly<Response>,
    endpoint: Readonly<Endpoint>,
): Promise<HandledOutput> {
    const origin = request.headers.origin;
    const matchedOrigin = await matchOrigin(endpoint, origin);
    const allowedMethods = getAllowedEndpointMethods(endpoint);

    if (request.method.toUpperCase() === HttpMethod.Options) {
        setResponseHeaders(response, buildOptionsRequestCorsHeaders(matchedOrigin, allowedMethods));
        response.sendStatus(HttpStatus.NoContent);
        return {handled: true};
    } else {
        setResponseHeaders(response, buildStandardCorsHeaders(matchedOrigin));
        return {handled: false};
    }
}

function buildStandardCorsHeaders(matchedOrigin: MatchedOrigin): HeadersToSet {
    if (matchedOrigin === AnyOrigin) {
        return {
            'Access-Control-Allow-Origin': '*',
        };
    } else if (matchedOrigin == undefined) {
        /** Do not allow the given origin. */
        return {};
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
): HeadersToSet {
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
    endpoint: Readonly<Pick<Endpoint, 'service' | 'requiredOrigin' | 'endpointPath'>>,
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
    throw new EndpointError(
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
