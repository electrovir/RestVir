import {assertWrap} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    HttpStatus,
    log,
    stringify,
    wrapInTry,
    type SelectFrom,
} from '@augment-vir/common';
import {
    type EndpointDefinition,
    type EndpointPathBase,
    type WebSocketDefinition,
} from '@rest-vir/define-service';
import {matchUrlToService} from '@rest-vir/define-service/src/service/match-url.js';
import {
    ContextInitParameters,
    GenericServiceImplementation,
    HttpMethod,
    RestVirHandlerError,
    ServerRequest,
    ServerResponse,
} from '@rest-vir/implement-service';
import {assertValidShape, isValidShape} from 'object-shape-tester';
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
    request: ServerRequest,
    response: ServerResponse,
    service: Readonly<
        SelectFrom<
            GenericServiceImplementation,
            {
                webSockets: true;
                endpoints: true;
                serviceName: true;
                createContext: true;
                serviceOrigin: true;
                requiredClientOrigin: true;
                logger: true;
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

    const endpointDefinition = pathMatch.endpointPath
        ? service.endpoints[pathMatch.endpointPath]
        : undefined;
    const webSocketDefinition =
        request.ws && pathMatch.webSocketPath
            ? service.webSockets[pathMatch.webSocketPath]
            : undefined;

    const route = endpointDefinition || webSocketDefinition;

    if (!route) {
        throw new RestVirHandlerError(
            {
                service,
                path: request.originalUrl as EndpointPathBase,
                isEndpoint: false,
                isWebSocket: false,
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
        service.logger.error(
            new RestVirHandlerError(
                route,
                `Rejected request body from '${request.originalUrl}': ${stringify(requestData)}`,
            ),
        );
        response.statusCode = HttpStatus.BadRequest;
        response.send('Invalid body.');
        return;
    }

    const contextParams: ContextInitParameters = {
        method: assertWrap.isEnumValue(request.method.toUpperCase(), HttpMethod),
        request,
        requestData,
        requestHeaders: request.headers,
        response,
        service,
        endpointDefinition: endpointDefinition,
        webSocketDefinition: webSocketDefinition,
    };

    const protocols = webSocketDefinition
        ? (request.headers['sec-websocket-protocol'] || '').split(', ')
        : undefined;

    if (
        webSocketDefinition?.protocolsShape &&
        !isValidShape(protocols, webSocketDefinition.protocolsShape)
    ) {
        try {
            assertValidShape(protocols, webSocketDefinition.protocolsShape);
        } catch (error) {
            log.error(
                ensureErrorAndPrependMessage(
                    error,
                    `WebSocket protocols rejected (${stringify(protocols)}):`,
                ),
            );
        }

        response.statusCode = HttpStatus.BadRequest;
        response.send('Invalid protocols.');
        return;
    }

    try {
        const contextOutput = await service.createContext?.(contextParams);

        if (contextOutput?.reject) {
            service.logger.error(
                new RestVirHandlerError(
                    route,
                    `Context creation rejected: '${request.originalUrl}'`,
                ),
            );
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
            protocols,
        };
    } catch (error) {
        throw ensureErrorAndPrependMessage(error, 'Failed to generate request context.');
    }
}

function extractRequestData(
    body: unknown,
    route: Readonly<
        SelectFrom<
            EndpointDefinition | WebSocketDefinition,
            {
                requestDataShape: true;
                path: true;
                service: {
                    serviceName: true;
                };
                isEndpoint: true;
                isWebSocket: true;
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
