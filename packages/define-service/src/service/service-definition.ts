import type {Overwrite} from '@augment-vir/common';
import {IsEqual, SetRequired} from 'type-fest';
import {EndpointPathBase} from '../endpoint/endpoint-path.js';
import {EndpointDefinition, EndpointInit, WithFinalEndpointProps} from '../endpoint/endpoint.js';
import {NoParam} from '../util/no-param.js';
import {OriginRequirement} from '../util/origin.js';
import {
    WebSocketDefinition,
    WebSocketInit,
    WithFinalWebSocketProps,
} from '../web-socket/web-socket-definition.js';
import {MinimalService} from './minimal-service.js';

/**
 * A string used for type errors triggered when an endpoint path is defined without a leading slash.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointMustStartWithSlashTypeError = 'ERROR: endpoint must start with a slash';

/**
 * Base type used for the right side of "extends" in type parameters for generic endpoint
 * definitions.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type BaseServiceEndpointsInit = Record<EndpointPathBase, EndpointInit>;

/**
 * Base type used for the right side of "extends" in type parameters for generic endpoint
 * definitions.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type BaseServiceWebSocketsInit = Record<EndpointPathBase, WebSocketInit>;

/**
 * Init for a service. This is used as an input to `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ServiceInit<
    ServiceName extends string,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam,
    WebSocketsInit extends BaseServiceWebSocketsInit | NoParam,
> = MinimalService<ServiceName> & {
    requiredClientOrigin: NonNullable<OriginRequirement>;
    webSockets?: IsEqual<WebSocketsInit, NoParam> extends true
        ? Record<EndpointPathBase, WebSocketInit>
        : {
              [WebSocketPath in keyof WebSocketsInit]: WebSocketPath extends EndpointPathBase
                  ? WebSocketsInit[WebSocketPath]
                  : WebSocketPath extends EndpointMustStartWithSlashTypeError
                    ? /** Prevent EndpointMustStartWithSlashTypeError from being used as an endpoint path. */
                      never
                    : EndpointMustStartWithSlashTypeError;
          };
    endpoints?: IsEqual<EndpointsInit, NoParam> extends true
        ? Record<EndpointPathBase, EndpointInit>
        : {
              [EndpointPath in keyof EndpointsInit]: EndpointPath extends EndpointPathBase
                  ? EndpointsInit[EndpointPath]
                  : EndpointPath extends EndpointMustStartWithSlashTypeError
                    ? /** Prevent EndpointMustStartWithSlashTypeError from being used as an endpoint path. */
                      never
                    : EndpointMustStartWithSlashTypeError;
          };
};

/**
 * A fully defined service (without executable endpoint implementations).
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ServiceDefinition<
    ServiceName extends string = any,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam = NoParam,
    WebSocketsInit extends BaseServiceWebSocketsInit | NoParam = NoParam,
> = MinimalService<ServiceName> & {
    requiredClientOrigin: NonNullable<OriginRequirement>;
    /** Include the initial init object so a service can be composed. */
    init: SetRequired<
        ServiceInit<ServiceName, EndpointsInit, WebSocketsInit>,
        'endpoints' | 'webSockets'
    >;
    webSockets: WebSocketsInit extends NoParam
        ? {
              [WebSocketPath in EndpointPathBase]: Overwrite<
                  WebSocketDefinition,
                  {
                      searchParamsShape: any;
                      SearchParamsType: any;
                      protocolsShape: any;
                      ProtocolsType: any;
                  }
              >;
          }
        : {
              [WebSocketPath in keyof WebSocketsInit]: WebSocketPath extends EndpointPathBase
                  ? WithFinalWebSocketProps<WebSocketsInit[WebSocketPath], WebSocketPath>
                  : EndpointMustStartWithSlashTypeError;
          };
    endpoints: EndpointsInit extends NoParam
        ? {
              [EndpointPath in EndpointPathBase]: Overwrite<
                  EndpointDefinition,
                  {
                      searchParamsShape: any;
                      SearchParamsType: any;
                  }
              >;
          }
        : {
              [EndpointPath in keyof EndpointsInit]: EndpointPath extends EndpointPathBase
                  ? WithFinalEndpointProps<EndpointsInit[EndpointPath], EndpointPath>
                  : EndpointMustStartWithSlashTypeError;
          };
    /** Given a URL, find the endpoint path from this service that matches it. */
};
