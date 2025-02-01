import {assertWrap} from '@augment-vir/assert';
import {HttpStatus, wrapInTry, type SelectFrom} from '@augment-vir/common';
import type {Endpoint, EndpointPathBase, Socket} from '@rest-vir/define-service';
import {matchUrlToService} from '@rest-vir/define-service/src/service/match-url.js';
import {
    ContextInitParameters,
    EndpointRequest,
    EndpointResponse,
    GenericServiceImplementation,
    HttpMethod,
    RestVirHandlerError,
} from '@rest-vir/implement-service';
import {isValidShape} from 'object-shape-tester';
import {handleHandlerResult} from './endpoint-handler.js';
import {handleCors} from './handle-cors.js';
import {handleRequestMethod} from './handle-request-method.js';

/**
 * Handles a request before it gets to the actual route handlers.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function preHandler(
    request: EndpointRequest,
    response: EndpointResponse,
    service: Readonly<
        SelectFrom<
            GenericServiceImplementation,
            {
                sockets: true;
                endpoints: true;
                serviceName: true;
                createContext: true;
                serviceOrigin: true;
                requiredOrigin: true;
            }
        >
    >,
    attachId: string,
) {
    const pathMatch = matchUrlToService(service, request.originalUrl);

    if (!pathMatch) {
        /** Nothing to do. */
        return;
    }

    const endpoint = pathMatch.endpointPath ? service.endpoints[pathMatch.endpointPath] : undefined;
    const socket =
        request.ws && pathMatch.socketPath ? service.sockets[pathMatch.socketPath] : undefined;

    const route = endpoint || socket;

    if (!route) {
        throw new RestVirHandlerError(
            {
                service,
                path: request.originalUrl as EndpointPathBase,
                endpoint: false,
                socket: false,
            },
            'No implementation found.',
        );
    }

    if (
        handleHandlerResult(
            await handleCors({
                request,
                route,
            }),
            response,
        ).responseSent ||
        handleHandlerResult(
            handleRequestMethod({
                request,
                route,
            }),
            response,
        ).responseSent
    ) {
        return;
    }

    const requestData = wrapInTry(() => extractRequestData(request.body, route));

    if (requestData instanceof Error) {
        response.statusCode = HttpStatus.BadRequest;
        response.send();
        return;
    }

    const contextParams: ContextInitParameters = {
        method: assertWrap.isEnumValue(request.method.toUpperCase(), HttpMethod),
        request,
        requestData,
        requestHeaders: request.headers,
        response,
        service,
        endpoint,
        socket,
    };

    const contextOutput = await service.createContext?.(contextParams);

    if (contextOutput?.reject) {
        handleHandlerResult(
            {
                body: contextOutput.reject.responseErrorMessage,
                statusCode: contextOutput.reject.statusCode,
                headers: contextOutput.reject.headers,
            },
            response,
        );
        return;
    }

    if (!request.restVirContext) {
        request.restVirContext = {};
    }

    request.restVirContext[attachId] = {
        context: contextOutput?.context,
        requestData,
    };
}

function extractRequestData(
    body: unknown,
    route: Readonly<
        SelectFrom<
            Endpoint | Socket,
            {
                requestDataShape: true;
                path: true;
                service: {
                    serviceName: true;
                };
                endpoint: true;
                socket: true;
            }
        >
    >,
): unknown {
    const dataShape = 'requestDataShape' in route ? route.requestDataShape : undefined;

    if (!dataShape) {
        if (body) {
            throw new Error(`Did not expect any request data but received it.`);
        } else {
            return undefined;
        }
    }

    if (
        !isValidShape(body, dataShape, {
            /** Allow extra keys for forwards / backwards compatibility. */
            allowExtraKeys: true,
        })
    ) {
        throw new Error('Invalid request data.');
    }

    return body;
}
