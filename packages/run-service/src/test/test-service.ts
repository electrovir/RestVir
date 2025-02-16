import {assert, assertWrap, check} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    log,
    mapObjectValues,
    mergeDeep,
    mergeDefinedProperties,
    omitObjectKeys,
    type AnyObject,
    type Overwrite,
    type PartialWithUndefined,
    type SelectFrom,
} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {
    assertValidWebSocketProtocols,
    buildEndpointRequestInit,
    buildWebSocketUrl,
    CollapsedFetchEndpointParams,
    EndpointDefinition,
    finalizeWebSocket,
    WebSocketLocation,
    type ClientWebSocket,
    type CollapsedConnectWebSocketParams,
    type NoParam,
    type WebSocketDefinition,
} from '@rest-vir/define-service';
import {GenericServiceImplementation} from '@rest-vir/implement-service';
import fastify, {FastifyInstance} from 'fastify';
import {type InjectOptions} from 'light-my-request';
import {type OutgoingHttpHeaders} from 'node:http';
import {buildUrl, parseUrl} from 'url-vir';
import {HandleRouteOptions} from '../handle-request/endpoint-handler.js';
import {attachService} from '../start-service/attach-service.js';
import {
    StartServiceOptions,
    type StartServiceUserOptions,
} from '../start-service/start-service-options.js';
import {applyDebugLogger} from '../util/debug.js';

/**
 * Options for {@link condenseResponse}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type CondenseResponseOptions = {
    /**
     * Include all headers that fastify automatically appends.
     *
     * @default false
     */
    includeFastifyHeaders: boolean;
};

/**
 * Condense a response into just the interesting properties for easier testing comparisons.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function condenseResponse(
    response: Response,
    options: PartialWithUndefined<CondenseResponseOptions> = {},
) {
    const bodyText = await response.text();
    const bodyObject = bodyText
        ? {
              body: bodyText,
          }
        : {};

    const headers: OutgoingHttpHeaders = Object.fromEntries(response.headers.entries());

    return {
        status: assertWrap.isHttpStatus(response.status),
        ...bodyObject,
        headers: options.includeFastifyHeaders
            ? headers
            : omitObjectKeys(headers, [
                  /**
                   * These headers are automatically set by fastify so we don't care about
                   * inspecting them in tests.
                   */
                  'connection',
                  'content-length',
                  'date',
                  'keep-alive',
              ]),
    };
}

/**
 * Used for each individual endpoint's fetcher in {@link FetchTestService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type FetchTestEndpoint<EndpointToTest extends EndpointDefinition> = (
    ...params: CollapsedFetchEndpointParams<EndpointToTest, false>
) => Promise<Response>;

/**
 * Used for each individual endpoint's fetcher in {@link FetchTestService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type ConnectTestWebSocket<WebSocketToTest extends WebSocketDefinition> = (
    ...params: CollapsedConnectWebSocketParams<WebSocketToTest, false>
) => Promise<ClientWebSocket<WebSocketToTest>>;

/**
 * Type for the `fetchEndpoint` function provided by {@link testService} and {@link describeService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type FetchTestService<
    Service extends SelectFrom<
        GenericServiceImplementation,
        {
            endpoints: true;
        }
    >,
> = {
    [EndpointPath in keyof Service['endpoints']]: Service['endpoints'][EndpointPath] extends EndpointDefinition
        ? FetchTestEndpoint<Service['endpoints'][EndpointPath]>
        : never;
};

/**
 * Type for the `connectWebSocket` function provided by {@link testService} and
 * {@link describeService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type ConnectTestServiceWebSocket<
    Service extends SelectFrom<
        GenericServiceImplementation,
        {
            webSockets: true;
        }
    >,
> = {
    [WebSocketPath in keyof Service['webSockets']]: Service['webSockets'][WebSocketPath] extends WebSocketDefinition
        ? ConnectTestWebSocket<Service['webSockets'][WebSocketPath]>
        : never;
};

/**
 * Options for {@link testService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type TestServiceOptions = Overwrite<
    StartServiceUserOptions,
    {
        port?: number | undefined | false;
    }
>;

/**
 * Test your service with actual Request and Response objects!
 *
 * The returned object includes a function to send fetches to directly to the running service. See
 * also {@link describeService}, which uses this function.
 *
 * By default, this uses Fastify's request injection strategy to avoid using up real system ports.
 * To instead listen to an actual port, set `port` in the options parameter.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function testService<
    const Service extends Readonly<
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
>(
    service: Readonly<Service>,
    testServiceOptions: Readonly<
        Omit<
            PartialWithUndefined<StartServiceUserOptions>,
            'workerCount' | 'preventWorkerRespawn' | ''
        >
    > = {},
) {
    const {
        host = 'localhost',
        port,
        debug,
    } = mergeDefinedProperties<TestServiceOptions>(
        {
            port: false,
            debug: true,
        },
        testServiceOptions,
        {
            workerCount: 1,
            preventWorkerRespawn: true,
        },
    );

    const server = fastify();
    /* node:coverage ignore next 5: this is just here to cover edge cases */
    if (debug) {
        server.setErrorHandler((error) => {
            log.error(ensureErrorAndPrependMessage(error, 'Fastify error handler caught:'));
        });
    }

    assert.isDefined(server, 'Service server was not started.');

    const output = {
        ...(await testExistingServer(server, service, {
            port: port || undefined,
            host,
            throwErrorsForExternalHandling: false,
            debug,
        })),
        /** Kill the server being tested. This should always be called after your tests are finished. */
        async kill(this: void) {
            await server.close();
        },
    };

    if (check.isNumber(port)) {
        await server.listen({
            port,
            host,
        });
    }

    return output;
}

/**
 * Similar to {@link testService} but used to test against a Fastify server that you've already
 * started elsewhere. This will merely attach all route listeners to it and return test callbacks.
 *
 * The returned object includes a function to send fetches to directly to the running service.
 *
 * By default, this uses Fastify's request injection strategy to avoid using up real system ports.
 * To instead listen to an actual port, set `port` in the options parameter.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function testExistingServer<
    const Service extends Readonly<
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
>(
    server: Readonly<FastifyInstance>,
    service: Readonly<Service>,
    options: Readonly<
        HandleRouteOptions &
            Omit<PartialWithUndefined<StartServiceOptions>, 'workerCount' | 'preventWorkerRespawn'>
    > = {},
) {
    applyDebugLogger(options.debug, service);
    await attachService(server, service, options);

    const fetchOrigin =
        options.port == undefined
            ? undefined
            : buildUrl({
                  protocol: 'http',
                  hostname: options.host,
                  port: options.port,
              }).origin;

    const fetchEndpoint = mapObjectValues(
        service.endpoints as GenericServiceImplementation['endpoints'],
        (endpointPath, endpoint) => {
            return async (
                ...args: CollapsedFetchEndpointParams<NoParam, false>
            ): Promise<Response> => {
                await server.ready();
                const overwrittenOriginEndpoint = mergeDeep(
                    endpoint as EndpointDefinition,
                    fetchOrigin
                        ? {
                              service: {
                                  serviceOrigin: fetchOrigin,
                              },
                          }
                        : {},
                );

                const {url, requestInit} = buildEndpointRequestInit<NoParam>(
                    overwrittenOriginEndpoint,
                    ...args,
                );

                const {href, fullPath} = parseUrl(url);

                if (fetchOrigin == undefined) {
                    const withPayload: Pick<InjectOptions, 'body'> = requestInit.body
                        ? {
                              body: requestInit.body,
                          }
                        : {};

                    const innerResponse = await server.inject({
                        remoteAddress: href,
                        headers: requestInit.headers as Record<string, string>,
                        method: requestInit.method as NonNullable<InjectOptions['method']>,
                        url: fullPath,
                        ...withPayload,
                    });

                    const response = new Response(innerResponse.rawPayload, {
                        status: innerResponse.statusCode,
                        headers: innerResponse.headers as Record<string, string>,
                        statusText: innerResponse.statusMessage,
                    });

                    return response;
                } else {
                    return globalThis.fetch(href, requestInit);
                }
            };
        },
    ) as AnyObject as FetchTestService<Service>;

    const webSocketOrigin =
        options.port == undefined
            ? undefined
            : buildUrl({
                  protocol: 'ws',
                  hostname: options.host,
                  port: options.port,
              }).origin;

    const connectWebSocket = mapObjectValues(
        service.webSockets as GenericServiceImplementation['webSockets'],
        (webSocketPath, webSocketDefinition) => {
            return async (
                ...args: CollapsedConnectWebSocketParams<NoParam, false>
            ): Promise<ClientWebSocket<WebSocketDefinition>> => {
                await server.ready();
                const [{protocols = [], listeners} = {}] = args;

                const overwrittenOriginWebSocket = mergeDeep(
                    webSocketDefinition as WebSocketDefinition,
                    webSocketOrigin
                        ? {
                              service: {
                                  serviceOrigin: webSocketOrigin,
                              },
                          }
                        : {},
                );

                const webSocketUrl = buildWebSocketUrl(overwrittenOriginWebSocket, ...args);

                assertValidWebSocketProtocols(protocols);

                const webSocket =
                    webSocketOrigin == undefined
                        ? ((await server.injectWS(
                              parseUrl(webSocketUrl).pathname,
                              protocols.length
                                  ? {
                                        headers: {
                                            'sec-websocket-protocol': protocols.join(', '),
                                        },
                                    }
                                  : {},
                          )) as unknown as globalThis.WebSocket)
                        : new WebSocket(webSocketUrl, protocols);

                const finalized = await finalizeWebSocket(
                    webSocketDefinition,
                    webSocket,
                    listeners,
                    WebSocketLocation.OnClient,
                );

                return finalized;
            };
        },
    ) as AnyObject as ConnectTestServiceWebSocket<Service>;

    return {
        /** Send a request to the service. */
        fetchEndpoint,
        /** Connect to a service WebSocket. */
        connectWebSocket,
    };
}

/**
 * Use this in conjunction with
 * [`@augment-vir/test`](https://www.npmjs.com/package/@augment-vir/test) or the Node.js built-in
 * test runner to run tests for a service and automatically kill the service when all tests have
 * finished. The describe callback is passed a params object which includes a fetch function.
 *
 * @category Testing
 * @category Package : @rest-vir/run-service
 * @example
 *
 * ```ts
 * import {describeService} from '@rest-vir/run-service';
 * import {it} from '@augment-vir/test';
 *
 * describeService({service: myService}, ({fetchEndpoint}) => {
 *     it('responds', async () => {
 *         const response = await fetchEndpoint['/my-endpoint']();
 *     });
 * });
 * ```
 *
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function describeService<
    const Service extends Readonly<
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
>(
    {
        service,
        options,
    }: {
        /** The service to startup and send requests to. */
        service: Readonly<Service>;
        /** Options for starting the service. */
        options?: PartialWithUndefined<StartServiceUserOptions>;
    },
    describeCallback: (params: {
        /** Send a request to the service. */
        fetchEndpoint: FetchTestService<Service>;
    }) => void | undefined,
) {
    const servicePromise = testService(service, options);

    const fetchServiceObject = mapObjectValues(service.endpoints, (endpointPath) => {
        return async (...args: any[]) => {
            const {fetchEndpoint} = await servicePromise;
            return await fetchEndpoint[endpointPath](...(args as any));
        };
    }) as FetchTestService<Service>;

    describe(service.serviceName, () => {
        describeCallback({
            fetchEndpoint: fetchServiceObject,
        });

        /**
         * The built-in Node.js test runner runs `it` calls sequentially so this will always be
         * called last.
         */
        it('can be killed', async () => {
            const {kill} = await servicePromise;
            await kill();
        });
    });
}
