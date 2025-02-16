import {check} from '@augment-vir/assert';
import {
    ErrorHttpStatusCategories,
    ExtractKeysWithMatchingValues,
    HttpMethod,
    HttpStatusByCategory,
    MaybePromise,
    SuccessHttpStatusCategories,
    getObjectTypedEntries,
} from '@augment-vir/common';
import {
    BaseSearchParams,
    BaseServiceEndpointsInit,
    EndpointDefinition,
    EndpointInit,
    EndpointPathBase,
    MinimalService,
    NoParam,
    ServiceDefinition,
    ServiceDefinitionError,
    WithFinalEndpointProps,
} from '@rest-vir/define-service';
import {type IncomingHttpHeaders, type OutgoingHttpHeaders} from 'node:http';
import {type IsEqual, type IsNever} from 'type-fest';
import {ServerRequest, type ServerResponse} from '../util/data.js';
import {type ServiceLogger} from '../util/service-logger.js';

/**
 * The part of {@link EndpointImplementationOutput} allowed for error responses.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointImplementationErrorOutput = {
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
};

/**
 * The object that all endpoint implementations should return.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type EndpointImplementationOutput<ResponseDataType = unknown> =
    | EndpointImplementationErrorOutput
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
    SpecificEndpoint extends EndpointDefinition | NoParam = NoParam,
> = {
    context: Context;
    method: IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? HttpMethod
        : ExtractKeysWithMatchingValues<
                Exclude<SpecificEndpoint, NoParam>['methods'],
                true
            > extends infer AvailableMethod
          ? IsNever<AvailableMethod> extends true
              ? HttpMethod
              : AvailableMethod
          : never;
    endpoint: IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? EndpointDefinition
        : SpecificEndpoint;
    service: MinimalService<ServiceName>;
    requestHeaders: IncomingHttpHeaders;

    requestData: IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? any
        : WithFinalEndpointProps<Exclude<SpecificEndpoint, NoParam>, any>['RequestType'];
    request: ServerRequest;
    response: ServerResponse;
    log: Readonly<ServiceLogger>;
    searchParams: SpecificEndpoint extends NoParam
        ? BaseSearchParams
        : Exclude<SpecificEndpoint, NoParam>['SearchParamsType'];
};

/**
 * Generic parameters for {@link EndpointImplementation} that should be compatible with _any_
 * endpoint implementation.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export type GenericEndpointImplementationParams = {
    context: any;
    method: any;
    endpoint: any;
    service: MinimalService<any>;
    requestHeaders: IncomingHttpHeaders;
    searchParams: BaseSearchParams;

    requestData: any;
    request: ServerRequest;
    response: ServerResponse;
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
    SpecificEndpoint extends EndpointDefinition | NoParam = NoParam,
> =
    IsEqual<Extract<SpecificEndpoint, NoParam>, NoParam> extends true
        ? (params: GenericEndpointImplementationParams) => any
        : (
              params: Readonly<
                  EndpointImplementationParams<Context, ServiceName, SpecificEndpoint>
              >,
          ) => MaybePromise<
              EndpointImplementationOutput<
                  WithFinalEndpointProps<SpecificEndpoint, any>['ResponseType']
              >
          >;

/**
 * All endpoint implementations to match the service definition's endpoints.
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

/**
 * Asserts that all endpoint implementations are valid.
 *
 * @category Internal
 * @category Package : @rest-vir/implement-service
 * @package [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service)
 */
export function assertValidEndpointImplementations(
    service: Readonly<Pick<ServiceDefinition, 'endpoints' | 'serviceName'>>,
    endpointImplementations: EndpointImplementations,
): asserts endpointImplementations is Record<EndpointPathBase, EndpointImplementation> {
    const nonFunctionImplementations = getObjectTypedEntries(endpointImplementations).filter(
        ([
            ,
            implementation,
        ]) => {
            return check.isNotFunction(implementation);
        },
    );

    if (nonFunctionImplementations.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `Endpoint implementations are not functions for endpoints: '${nonFunctionImplementations
                .map(([endpointPath]) => endpointPath)
                .join(',')}'`,
            serviceName: service.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
        });
    }

    const missingEndpointImplementationPaths: string[] = [];
    const extraEndpointImplementationPaths: string[] = [];

    Object.keys(service.endpoints).forEach((key) => {
        if (!(key in endpointImplementations)) {
            missingEndpointImplementationPaths.push(key);
        }
    });

    Object.keys(endpointImplementations).forEach((key) => {
        if (!(key in service.endpoints)) {
            extraEndpointImplementationPaths.push(key);
        }
    });

    if (missingEndpointImplementationPaths.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `Endpoints are missing implementations: '${missingEndpointImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
        });
    }

    if (extraEndpointImplementationPaths.length) {
        throw new ServiceDefinitionError({
            path: undefined,
            errorMessage: `Endpoint implementations have extra endpoints: '${extraEndpointImplementationPaths.join(
                ',',
            )}'`,
            serviceName: service.serviceName,
            isEndpoint: undefined,
            isWebSocket: undefined,
        });
    }
}
