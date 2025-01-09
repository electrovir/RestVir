import {
    ArrayElement,
    ErrorHttpStatusCategories,
    ExtractKeysWithMatchingValues,
    HttpStatusByCategory,
    MaybePromise,
    SuccessHttpStatusCategories,
    type Logger,
} from '@augment-vir/common';
import {
    BaseServiceEndpointsInit,
    Endpoint,
    EndpointInit,
    EndpointPathBase,
    HttpMethod,
    MinimalService,
    NoParam,
    WithFinalEndpointProps,
} from '@rest-vir/define-service';
import {type IncomingMessage} from 'node:http';
import {type MinimalRequest} from '../request.js';

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
          headers?: Record<string, string> | undefined;
      }
    | ({
          statusCode: HttpStatusByCategory<SuccessHttpStatusCategories>;

          responseErrorMessage?: never;
          headers?: Record<string, string> | undefined;
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
    ServiceName extends string = string,
    SpecificEndpoint extends Endpoint | NoParam = NoParam,
> = {
    context: Context;
    auth: Exclude<SpecificEndpoint, NoParam> extends never
        ? unknown
        : ArrayElement<Exclude<SpecificEndpoint, NoParam>['requiredAuth']>;
    method: Exclude<SpecificEndpoint, NoParam> extends never
        ? HttpMethod
        : ExtractKeysWithMatchingValues<Exclude<SpecificEndpoint, NoParam>['methods'], true>;
    endpoint: Exclude<SpecificEndpoint, NoParam> extends never ? Endpoint : SpecificEndpoint;
    service: MinimalService<ServiceName>;

    requestData: Exclude<SpecificEndpoint, NoParam> extends never
        ? any
        : WithFinalEndpointProps<Exclude<SpecificEndpoint, NoParam>, any>['RequestType'];
    request: Readonly<IncomingMessage & MinimalRequest>;
    log: Logger;
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
    ServiceName extends string = string,
    SpecificEndpoint extends Endpoint | NoParam = NoParam,
> = (
    params: Readonly<EndpointImplementationParams<Context, ServiceName, SpecificEndpoint>>,
) => MaybePromise<
    EndpointImplementationOutput<WithFinalEndpointProps<SpecificEndpoint, any>['ResponseType']>
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
    ServiceName extends string = string,
    EndpointsInit extends BaseServiceEndpointsInit | NoParam = NoParam,
> = EndpointsInit extends NoParam
    ? {
          [EndpointPath in EndpointPathBase]: EndpointImplementation<
              any,
              ServiceName,
              WithFinalEndpointProps<EndpointInit, EndpointPath>
          >;
      }
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
