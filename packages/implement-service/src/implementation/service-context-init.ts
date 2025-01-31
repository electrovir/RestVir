import {HttpMethod, MaybePromise, Values} from '@augment-vir/common';
import {
    type BaseServiceEndpointsInit,
    type BaseServiceSocketsInit,
    type Endpoint,
    type EndpointPathBase,
    type MinimalService,
    type NoParam,
    type Socket,
    type WithFinalEndpointProps,
    type WithFinalSocketProps,
} from '@rest-vir/define-service';
import {type IncomingHttpHeaders} from 'node:http';
import type {RequireExactlyOne} from 'type-fest';
import {type EndpointRequest, type EndpointResponse} from '../util/message.js';
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
    SocketsInit extends BaseServiceSocketsInit | NoParam,
> = (
    params: Readonly<ContextInitParameters<ServiceName, EndpointsInit, SocketsInit>>,
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
    SocketsInit extends BaseServiceSocketsInit | NoParam = NoParam,
> = {
    service: MinimalService<ServiceName>;
    requestHeaders: IncomingHttpHeaders;
    method: HttpMethod;

    request: EndpointRequest;
    response: EndpointResponse;

    endpoint?: EndpointsInit extends NoParam
        ? Endpoint
        : WithFinalEndpointProps<
              Values<EndpointsInit>,
              Extract<keyof EndpointsInit, EndpointPathBase>
          >;
    socket?: SocketsInit extends NoParam
        ? Socket
        : WithFinalSocketProps<Values<SocketsInit>, Extract<keyof SocketsInit, EndpointPathBase>>;
};
