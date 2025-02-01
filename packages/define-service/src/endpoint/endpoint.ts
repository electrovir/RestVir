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
    requiredOrigin?: OriginRequirement;

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
    /**
     * Set a required client origin for this endpoint.
     *
     * - If this is omitted, the service's origin requirement is used instead.
     * - If this is explicitly set to `undefined`, this endpoint allows any origins (regardless of the
     *   service's origin requirement).
     * - Any other set value overrides the service's origin requirement (if it has any).
     */
    requiredOrigin: originRequirementShape,
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
 * Adds final properties to {@link EndpointInit} so it becomes {@link Endpoint}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WithFinalEndpointProps<T, EndpointPath extends EndpointPathBase> = (T extends AnyObject
    ? Overwrite<
          T,
          {
              requestDataShape: T['requestDataShape'] extends NoParam
                  ? ShapeDefinition<any, true> | undefined
                  : undefined extends T['requestDataShape']
                    ? undefined
                    : ShapeDefinition<T['requestDataShape'], true>;
              responseDataShape: T['responseDataShape'] extends NoParam
                  ? ShapeDefinition<any, true> | undefined
                  : undefined extends T['responseDataShape']
                    ? undefined
                    : ShapeDefinition<T['responseDataShape'], true>;
              RequestType: T['requestDataShape'] extends NoParam
                  ? any
                  : undefined extends T['requestDataShape']
                    ? undefined
                    : ShapeToRuntimeType<ShapeDefinition<T['requestDataShape'], true>, false, true>;
              ResponseType: T['responseDataShape'] extends NoParam
                  ? any
                  : undefined extends T['responseDataShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<T['responseDataShape'], true>,
                          false,
                          true
                      >;
              customProps: 'customProps' extends keyof T ? T['customProps'] : undefined;
          }
      >
    : never) & {
    path: EndpointPath;
    socket: false;
    endpoint: true;
    service: MinimalService;
};

/**
 * A fully defined endpoint instance. This is generated from `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type Endpoint<
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
 * Extracts response and request data from an endpoint definition.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type BaseEndpointForExecutorData = Pick<Endpoint, 'requestDataShape' | 'responseDataShape'>;

/**
 * Extracts response and request data from an endpoint definition into different properties.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointExecutorData<Endpoint extends BaseEndpointForExecutorData> = {
    request: ShapeToRuntimeType<Endpoint['requestDataShape'], false, true>;
    response: ShapeToRuntimeType<Endpoint['responseDataShape'], false, true>;
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
): asserts endpoint is T & Pick<Endpoint, 'RequestType' | 'ResponseType'> {
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
 * Asserts that the given finalized {@link Endpoint} instance is valid.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function assertValidEndpoint(
    endpoint: Readonly<
        SelectFrom<
            Endpoint,
            {
                path: true;
                methods: true;
                socket: true;
                endpoint: true;
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
