import {
    ArrayElement,
    ErrorHttpStatusCategories,
    ExtractKeysWithMatchingValues,
    HttpMethod,
    HttpStatusByCategory,
    MaybePromise,
    Overwrite,
    SuccessHttpStatusCategories,
} from '@augment-vir/common';
import {
    BaseServiceEndpointsInit,
    Endpoint,
    EndpointInit,
    EndpointPathBase,
    MinimalService,
    NoParam,
    ServiceDefinition,
    WithFinalEndpointProps,
} from '@rest-vir/define-service';
import type {IncomingHttpHeaders, OutgoingHttpHeaders} from 'node:http';
import {type IsEqual} from 'type-fest';
import {EndpointRequest, type EndpointResponse} from '../util/message.js';
import {type ServiceLogger} from '../util/service-logger.js';

/**
 * User-defined service Context or Context generator.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ContextInit<Context> =
    | Context
    | ((
          params: Readonly<Omit<EndpointImplementationParams, 'context' | 'auth'>>,
      ) => MaybePromise<Context>);

/**
 * User-defined function that extracts the current auth of an individual request.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ExtractAuth<Context, AllowedAuth extends ReadonlyArray<any> | undefined> =
    Exclude<AllowedAuth, undefined> extends never
        ? undefined
        : (
              params: Readonly<Omit<EndpointImplementationParams<Context>, 'auth'>>,
          ) => MaybePromise<
              (AllowedAuth extends any[] ? ArrayElement<AllowedAuth> : undefined) | undefined
          >;

/**
 * A fully implemented endpoint.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type ImplementedEndpoint<
    Context = any,
    ServiceName extends string = any,
    SpecificEndpoint extends Endpoint = Endpoint,
> = Overwrite<
    SpecificEndpoint,
    {
        service: GenericServiceImplementation;
    }
> & {
    implementation: EndpointImplementation<Context, ServiceName>;
};

/**
 * A super generic service implementation that be assigned to from any concrete service
 * implementation.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type GenericServiceImplementation = Omit<ServiceDefinition, 'endpoints'> & {
    endpoints: Record<EndpointPathBase, ImplementedEndpoint>;
    context: ContextInit<any>;
    extractAuth: ExtractAuth<any, any> | undefined;
    logger: ServiceLogger;
};

/**
 * The object that all endpoint implementations should return.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointImplementationOutput<ResponseDataType = unknown> =
    | {
          statusCode: HttpStatusByCategory<ErrorHttpStatusCategories>;
          /**
           * An error message which will get sent to the frontend.
           *
           * DO NOT INCLUDE SENSITIVE INFORMATION IN HERE.
           */
          responseErrorMessage?: string | undefined;
          responseData?: undefined;
          headers?: OutgoingHttpHeaders | undefined;
          dataType?: undefined;
      }
    | ({
          statusCode: HttpStatusByCategory<SuccessHttpStatusCategories>;

          responseErrorMessage?: never;

          /**
           * Set the response data type. If any response data is included, the default is
           * `application/json`.
           */
          dataType?: string | undefined;
          headers?: OutgoingHttpHeaders | undefined;
      } & (ResponseDataType extends undefined
          ? {responseData?: ResponseDataType}
          : {responseData: ResponseDataType}));

/**
 * The object that all endpoint implementations receive as an input.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointImplementationParams<
    Context = any,
    ServiceName extends string = any,
    SpecificEndpoint extends Endpoint | NoParam = NoParam,
> = {
    context: Context;
    auth: IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? unknown
        : ArrayElement<Exclude<SpecificEndpoint, NoParam>['requiredAuth']>;
    method: IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? HttpMethod
        : ExtractKeysWithMatchingValues<Exclude<SpecificEndpoint, NoParam>['methods'], true>;
    endpoint: IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? Endpoint
        : SpecificEndpoint;
    service: MinimalService<ServiceName>;
    requestHeaders: IncomingHttpHeaders;

    requestData: IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? any
        : WithFinalEndpointProps<Exclude<SpecificEndpoint, NoParam>, any>['RequestType'];
    request: EndpointRequest;
    response: EndpointResponse;
    log: Readonly<ServiceLogger>;
};

/**
 * A full, type-safe endpoint implementation type.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointImplementation<
    Context = any,
    ServiceName extends string = any,
    SpecificEndpoint extends Endpoint | NoParam = NoParam,
> = (
    params: Readonly<EndpointImplementationParams<Context, ServiceName, SpecificEndpoint>>,
) => IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
    ? any
    : MaybePromise<
          EndpointImplementationOutput<
              WithFinalEndpointProps<SpecificEndpoint, any>['ResponseType']
          >
      >;

/**
 * All endpoint implementations to match the given endpoint definition inits object.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointImplementations<
    Context = any,
    ServiceName extends string = any,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam = NoParam,
> = EndpointsInit extends NoParam
    ? Record<EndpointPathBase, EndpointImplementation>
    : {
          [EndpointPath in keyof EndpointsInit]: EndpointsInit[EndpointPath] extends EndpointInit
              ? EndpointPath extends EndpointPathBase
                  ? EndpointImplementation<
                        Context,
                        ServiceName,
                        WithFinalEndpointProps<EndpointsInit[EndpointPath], EndpointPath>
                    >
                  : never
              : never;
      };
