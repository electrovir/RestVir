import {
    AnyObject,
    HttpMethod,
    JsonCompatibleValue,
    Overwrite,
    type SelectFrom,
} from '@augment-vir/common';
import {
    defineShape,
    enumShape,
    indexedKeys,
    optional,
    or,
    unknownShape,
    type ShapeDefinition,
    type ShapeToRuntimeType,
} from 'object-shape-tester';
import {type RequireAtLeastOne} from 'type-fest';
import {type MinimalService} from '../service/minimal-service.js';
import {ensureServiceDefinitionError} from '../service/service-definition.error.js';
import {type NoParam} from '../util/no-param.js';
import {originRequirementShape, type OriginRequirement} from '../util/origin.js';
import {BaseSearchParams} from '../util/search-params.js';
import {assertValidEndpointPath, type EndpointPathBase} from './endpoint-path.js';

/**
 * Base Endpoint request/response shape type.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointDataShapeBase = JsonCompatibleValue;

/**
 * The type for setting up an individual endpoint, used in `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointInit<
    AllowedMethods extends RequireAtLeastOne<Record<HttpMethod, boolean>> = RequireAtLeastOne<
        Record<HttpMethod, boolean>
    >,
    RequestDataShape extends EndpointDataShapeBase | NoParam = EndpointDataShapeBase | NoParam,
    ResponseDataShape = unknown,
> = {
    /**
     * Shape definition for request data. Set to `undefined` for no request data.
     *
     * See the [`object-shape-tester`](https://www.npmjs.com/package/object-shape-tester) package
     * for extra details on defining a shape.
     */
    requestDataShape: RequestDataShape;
    /**
     * Shape definition for response data. Set to `undefined` for no response data.
     *
     * See the [`object-shape-tester`](https://www.npmjs.com/package/object-shape-tester) package
     * for extra details on defining a shape.
     */
    responseDataShape: ResponseDataShape;
    /**
     * All allowed (or not allowed) HTTP methods for this endpoint. Set `true` for each allowed
     * method and omit or set `false` for each blocked method.
     */
    methods: AllowedMethods;
    /**
     * Set a required client origin for this endpoint.
     *
     * - If this is omitted, the service's origin requirement is used instead.
     * - If this is explicitly set to `undefined`, this endpoint allows any origins (regardless of the
     *   service's origin requirement).
     * - Any other set value overrides the service's origin requirement (if it has any).
     */
    requiredClientOrigin?: OriginRequirement;
    /**
     * A shape used to verify search params. This should match the entire search params object.
     *
     * Note the following:
     *
     * - Search param values will _always_ be in an array
     * - Elements in search param value arrays will _always_ be strings
     *
     * @example
     *
     * ```ts
     * import {exact, enumShape} from 'object-shape-tester';
     *
     * const partialEndpointInit = {
     *     searchParamsShape: {
     *         // use `tupleShape` to ensure there's exactly one entry for this search param
     *         userId: tupleShape(enumShape(MyEnum)),
     *         date: tupleShape(exact('2')),
     *         // don't use `tupleShape` here so that there can be any number of entries
     *         colors: [''],
     *     },
     * };
     * ```
     */
    searchParamsShape?: unknown;

    /**
     * Any additional data that you wish to attach to this endpoint. This won't be used by the
     * service at all, it's merely a place for you to place extra data which will be passed along to
     * your endpoint implementations.
     */
    customProps?: Record<PropertyKey, unknown> | undefined;
};

/**
 * Used to validate {@link EndpointInit} inside of `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export const endpointInitShape = defineShape({
    requestDataShape: unknownShape(),
    responseDataShape: unknownShape(),
    searchParamsShape: unknownShape(),
    /**
     * Set a required client origin for this endpoint.
     *
     * - If this is omitted, the service's origin requirement is used instead.
     * - If this is explicitly set to `undefined`, this endpoint allows any origins (regardless of the
     *   service's origin requirement).
     * - Any other set value overrides the service's origin requirement (if it has any).
     */
    requiredClientOrigin: originRequirementShape,
    methods: indexedKeys({
        keys: enumShape(HttpMethod),
        values: false,
        required: false,
    }),
    customProps: optional(
        or(
            undefined,
            indexedKeys({
                keys: unknownShape(),
                values: unknownShape(),
                required: false,
            }),
        ),
    ),
} satisfies Record<keyof EndpointInit, any>);

/**
 * Adds final properties to {@link EndpointInit} so it becomes {@link EndpointDefinition}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WithFinalEndpointProps<
    Init,
    EndpointPath extends EndpointPathBase,
> = (Init extends AnyObject
    ? Overwrite<
          Init,
          {
              requestDataShape: Init['requestDataShape'] extends NoParam
                  ? ShapeDefinition<any, true> | undefined
                  : undefined extends Init['requestDataShape']
                    ? undefined
                    : ShapeDefinition<Init['requestDataShape'], true>;
              responseDataShape: Init['responseDataShape'] extends NoParam
                  ? ShapeDefinition<any, true> | undefined
                  : undefined extends Init['responseDataShape']
                    ? undefined
                    : ShapeDefinition<Init['responseDataShape'], true>;
              RequestType: Init['requestDataShape'] extends NoParam
                  ? any
                  : undefined extends Init['requestDataShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<Init['requestDataShape'], true>,
                          false,
                          true
                      >;
              ResponseType: Init['responseDataShape'] extends NoParam
                  ? any
                  : undefined extends Init['responseDataShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<Init['responseDataShape'], true>,
                          false,
                          true
                      >;
              searchParamsShape: 'searchParamsShape' extends keyof Init
                  ? undefined extends Init['searchParamsShape']
                      ? undefined
                      : ShapeDefinition<Init['searchParamsShape'], true> | undefined
                  : undefined;
              SearchParamsType: undefined extends Init['searchParamsShape']
                  ? BaseSearchParams
                  : ShapeToRuntimeType<
                        ShapeDefinition<Init['searchParamsShape'], true>,
                        false,
                        true
                    >;
              customProps: 'customProps' extends keyof Init ? Init['customProps'] : undefined;
          }
      >
    : never) & {
    path: EndpointPath;
    isWebSocket: false;
    isEndpoint: true;
    service: MinimalService;
};

/**
 * A fully defined endpoint instance. This is generated from `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointDefinition<
    AllowedMethods extends RequireAtLeastOne<Record<HttpMethod, boolean>> = RequireAtLeastOne<
        Record<HttpMethod, boolean>
    >,
    RequestDataShape extends EndpointDataShapeBase | NoParam = NoParam,
    ResponseDataShape extends EndpointDataShapeBase | NoParam = NoParam,
    EndpointPath extends EndpointPathBase = EndpointPathBase,
> = WithFinalEndpointProps<
    EndpointInit<AllowedMethods, RequestDataShape, ResponseDataShape>,
    EndpointPath
>;

/**
 * A generic version of {@link EndpointDefinition} that any endpoint can be assigned to.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type GenericEndpointDefinition = Overwrite<
    EndpointDefinition,
    {
        searchParamsShape: any;
        SearchParamsType: any;
    }
>;

/**
 * Extracts response and request data from an endpoint definition.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type BaseEndpointForExecutorData = Pick<
    EndpointDefinition,
    'requestDataShape' | 'responseDataShape'
>;

/**
 * Extracts response and request data from an endpoint definition into different properties.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointExecutorData<SpecificEndpoint extends BaseEndpointForExecutorData> = {
    request: ShapeToRuntimeType<SpecificEndpoint['requestDataShape'], false, true>;
    response: ShapeToRuntimeType<SpecificEndpoint['responseDataShape'], false, true>;
};

/**
 * Attaches request and response type-only getters to an endpoint definition.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function attachEndpointShapeTypeGetters<const T extends AnyObject>(
    endpoint: T,
): asserts endpoint is T & Pick<EndpointDefinition, 'RequestType' | 'ResponseType'> {
    Object.defineProperties(endpoint, {
        RequestType: {
            enumerable: false,
            get(): any {
                throw new Error('.RequestType should not be used as a value.');
            },
        },
        ResponseType: {
            enumerable: false,
            get(): any {
                throw new Error('.ResponseType should not be used as a value.');
            },
        },
    });
}

/**
 * Asserts that the given finalized {@link EndpointDefinition} instance is valid.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function assertValidEndpoint(
    endpoint: Readonly<
        SelectFrom<
            EndpointDefinition,
            {
                path: true;
                methods: true;
                isWebSocket: true;
                isEndpoint: true;
                service: {
                    serviceName: true;
                };
            }
        >
    >,
) {
    try {
        assertValidEndpointPath(endpoint.path);
        if (!Object.values(endpoint.methods).some((value) => value)) {
            throw new Error('Endpoint has no allowed HTTP methods.');
        }
    } catch (error) {
        throw ensureServiceDefinitionError(error, {
            serviceName: endpoint.service.serviceName,
            ...endpoint,
        });
    }
}
