import {assert} from '@augment-vir/assert';
import {
    AnyObject,
    AtLeastTuple,
    extractErrorMessage,
    JsonCompatibleValue,
    MaybePromise,
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
import {assertValidEndpointAuth} from './endpoint-auth.js';
import {type EndpointPathBase} from './endpoint-path.js';
import {HttpMethod} from './http-method.js';
import {type MinimalService} from './minimal-service.js';
import {type NoParam} from './no-param.js';
import {ServiceDefinitionError} from './service-definition.error.js';

/**
 * Base Endpoint request/response shape type.
 *
 * @category Internal
 */
export type EndpointDataShapeBase = JsonCompatibleValue;

/**
 * Expands the given `AllowedAuth` type to the allowed `requiredAuth` input type for
 * {@link EndpointInit}.
 *
 * @category Internal
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
 * @category Endpoint
 */
export type EndpointInit<
    AllowedAuth extends ReadonlyArray<any> | undefined = any,
    AllowedMethods extends RequireAtLeastOne<Record<HttpMethod, boolean>> = RequireAtLeastOne<
        Record<HttpMethod, boolean>
    >,
    RequestDataShape extends EndpointDataShapeBase | NoParam = EndpointDataShapeBase | NoParam,
    ResponseDataShape extends EndpointDataShapeBase | NoParam = EndpointDataShapeBase | NoParam,
> = {
    /**
     * Set to `undefined` to allow any auth. Otherwise set this to a subset of the service
     * definition's allowed auth.
     */
    requiredAuth: RequiredAuth<NoInfer<AllowedAuth>>;
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
     * Set to `undefined` to allow any and all origins. Set to a string or RegExp or any array of
     * either to match any incoming origins against them. This may also be a function that is given
     * the request's origin.
     */
    requiredClientOrigin:
        | undefined
        | string
        | RegExp
        | (RegExp | string)[]
        | ((origin: string | undefined) => MaybePromise<boolean>);
};

/**
 * Used to validate {@link EndpointInit} inside of `defineService`.
 *
 * @category Internal
 */
export const endpointInitShape = defineShape({
    requiredAuth: or(undefined, [unknownShape()]),
    requestDataShape: unknownShape(),
    responseDataShape: unknownShape(),
    /** Possible required origin shapes. */
    requiredClientOrigin: or(undefined, '', classShape(RegExp), () => {}, [
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
 * @category Endpoint
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
 */
export type BaseEndpointForExecutorData = Pick<Endpoint, 'requestDataShape' | 'responseDataShape'>;

/**
 * Extracts response and request data from an endpoint definition into different properties.
 *
 * @category Internal
 */
export type EndpointExecutorData<Endpoint extends BaseEndpointForExecutorData> = {
    request: ShapeToRuntimeType<Endpoint['requestDataShape'], false, true>;
    response: ShapeToRuntimeType<Endpoint['responseDataShape'], false, true>;
};

/**
 * Attaches request and response type-only getters to an endpoint definition.
 *
 * @category Internal
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
        assert.startsWith(endpoint.endpointPath, '/', 'Endpoint path does not start with /');
        assert.endsWithout(endpoint.endpointPath, '/', 'Endpoint path cannot end with /');
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
