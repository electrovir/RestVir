import {HttpMethod, MaybePromise, Values} from '@augment-vir/common';
import {
    type BaseServiceEndpointsInit,
    type BaseServiceWebSocketsInit,
    type EndpointDefinition,
    type EndpointPathBase,
    type MinimalService,
    type NoParam,
    type WebSocketDefinition,
    type WithFinalEndpointProps,
    type WithFinalWebSocketProps,
} from '@rest-vir/define-service';
import {type IncomingHttpHeaders} from 'node:http';
import {type RequireExactlyOne} from 'type-fest';
import {type ServerRequest, type ServerResponse} from '../util/data.js';
import {EndpointImplementationErrorOutput} from './implement-endpoint.js';

/**
 * User-defined service implementation Context generator.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ContextInit<
    Context,
    ServiceName extends string,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam,
    WebSocketsInit extends BaseServiceWebSocketsInit | NoParam,
> = (
    params: Readonly<ContextInitParameters<ServiceName, EndpointsInit, WebSocketsInit>>,
) => MaybePromise<
    RequireExactlyOne<{
        /** The context created for this request. */
        context: Context;
        /**
         * Instead of creating a context object for the current request, instead, reject the request
         * with the specified status code and other options.
         */
        reject: EndpointImplementationErrorOutput;
    }>
>;

/**
 * Parameters for {@link ContextInit}.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ContextInitParameters<
    ServiceName extends string = any,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam = NoParam,
    WebSocketsInit extends BaseServiceWebSocketsInit | NoParam = NoParam,
> = {
    service: MinimalService<ServiceName>;
    requestHeaders: IncomingHttpHeaders;
    method: HttpMethod;
    requestData: EndpointsInit extends NoParam
        ? unknown
        : WithFinalEndpointProps<
              Values<EndpointsInit>,
              Extract<keyof EndpointsInit, EndpointPathBase>
          >['RequestType'];

    request: ServerRequest;
    response: ServerResponse;

    endpointDefinition?:
        | (EndpointsInit extends NoParam
              ? EndpointDefinition
              : WithFinalEndpointProps<
                    Values<EndpointsInit>,
                    Extract<keyof EndpointsInit, EndpointPathBase>
                >)
        | undefined;
    webSocketDefinition?:
        | (WebSocketsInit extends NoParam
              ? WebSocketDefinition
              : WithFinalWebSocketProps<
                    Values<WebSocketsInit>,
                    Extract<keyof WebSocketsInit, EndpointPathBase>
                >)
        | undefined;
};
