import {assert} from '@augment-vir/assert';
import {
    AnyObject,
    AtLeastTuple,
    extractErrorMessage,
    JsonCompatibleValue,
    Overwrite,
} from '@augment-vir/common';
import {
    classShape,
    defineShape,
    enumShape,
    indexedKeys,
    or,
    unknownShape,
    type ShapeDefinition,
    type ShapeToRuntimeType,
} from 'object-shape-tester';
import {IsEqual, type RequireAtLeastOne} from 'type-fest';
import {type MinimalService} from '../service/minimal-service.js';
import {ServiceDefinitionError} from '../service/service-definition.error.js';
import {HttpMethod} from '../util/http-method.js';
import {type NoParam} from '../util/no-param.js';
import {type OriginRequirement} from '../util/origin.js';
import {assertValidEndpointAuth} from './endpoint-auth.js';
import {type EndpointPathBase} from './endpoint-path.js';

/**
 * Base Endpoint request/response shape type.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointDataShapeBase = JsonCompatibleValue;

/**
 * Expands the given `AllowedAuth` type to the allowed `requiredAuth` input type for
 * {@link EndpointInit}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type RequiredAuth<AllowedAuth extends ReadonlyArray<any> | undefined | NoParam> =
    IsEqual<AllowedAuth, undefined> extends true
        ? undefined
        : AllowedAuth extends Array<infer Element>
          ? AtLeastTuple<Element, 1> | undefined
          : any;

/**
 * The type for setting up an individual endpoint, used in `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type EndpointInit<
    AllowedAuth extends ReadonlyArray<any> | undefined = any,
    AllowedMethods extends RequireAtLeastOne<Record<HttpMethod, boolean>> = RequireAtLeastOne<
        Record<HttpMethod, boolean>
    >,
    RequestDataShape extends EndpointDataShapeBase | NoParam = EndpointDataShapeBase | NoParam,
    ResponseDataShape extends EndpointDataShapeBase | NoParam = EndpointDataShapeBase | NoParam,
> = (AllowedAuth extends undefined
    ? {
          /**
           * Set to `undefined` to allow any auth. Otherwise set this to a subset of the service
           * definition's allowed auth.
           */
          requiredAuth?: RequiredAuth<NoInfer<AllowedAuth>>;
      }
    : {
          /**
           * Set to `undefined` to allow any auth. Otherwise set this to a subset of the service
           * definition's allowed auth.
           */
          requiredAuth: RequiredAuth<NoInfer<AllowedAuth>>;
      }) & {
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
};

/**
 * Used to validate {@link EndpointInit} inside of `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export const endpointInitShape = defineShape({
    requiredAuth: or(undefined, [unknownShape()]),
    requestDataShape: unknownShape(),
    responseDataShape: unknownShape(),
    /** Possible required origin shapes. */
    requiredOrigin: or(undefined, '', classShape(RegExp), () => {}, [
        or('', classShape(RegExp)),
    ]),
    methods: indexedKeys({
        keys: enumShape(HttpMethod),
        values: false,
        required: false,
    }),
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
                    : ShapeDefinition<T['requestDataShape'], false>['runtimeType'];
              ResponseType: T['responseDataShape'] extends NoParam
                  ? any
                  : undefined extends T['responseDataShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<T['responseDataShape'], true>,
                          false,
                          true
                      >;
          }
      >
    : never) & {
    endpointPath: EndpointPath;
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
    AllowedAuth extends ReadonlyArray<any> | undefined = any,
    AllowedMethods extends RequireAtLeastOne<Record<HttpMethod, boolean>> = RequireAtLeastOne<
        Record<HttpMethod, boolean>
    >,
    RequestDataShape extends EndpointDataShapeBase | NoParam = NoParam,
    ResponseDataShape extends EndpointDataShapeBase | NoParam = NoParam,
    EndpointPath extends EndpointPathBase = EndpointPathBase,
> = WithFinalEndpointProps<
    EndpointInit<AllowedAuth, AllowedMethods, RequestDataShape, ResponseDataShape>,
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
export function assertValidEndpoint<
    /**
     * This will be provided from the user for the endpoint as a whole. This is a union or enum of
     * all possible auth values, which `requiredEndpointAuth` must be a subset of.
     */
    AllowedAuthEntries,
>(
    endpoint: Readonly<Pick<Endpoint, 'endpointPath' | 'requiredAuth' | 'methods'>>,
    {
        serviceName,
        allowedAuth,
    }: {
        /**
         * ServiceName is used purely for error messaging purposes, so that it's possible to
         * understand which service the endpoint is coming from.
         */
        serviceName: string;
        allowedAuth: Readonly<AtLeastTuple<AllowedAuthEntries, 1>> | undefined;
    },
) {
    try {
        assertValidEndpointAuth({
            allowedAuth,
            requiredEndpointAuth: endpoint.requiredAuth,
            endpointPath: endpoint.endpointPath,
            serviceName,
        });
        if (endpoint.endpointPath !== '/') {
            assert.startsWith(endpoint.endpointPath, '/', 'Endpoint path does not start with /');
            assert.endsWithout(endpoint.endpointPath, '/', 'Endpoint path cannot end with /');
        }
        if (!Object.values(endpoint.methods).some((value) => value)) {
            throw new Error('Endpoint has no allowed HTTP methods.');
        }
    } catch (caught) {
        if (caught instanceof ServiceDefinitionError) {
            throw caught;
        } else {
            throw new ServiceDefinitionError({
                endpointPath: endpoint.endpointPath,
                serviceName,
                errorMessage: extractErrorMessage(caught),
            });
        }
    }
}
