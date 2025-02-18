import {AnyObject, Overwrite, type SelectFrom} from '@augment-vir/common';
import {
    defineShape,
    indexedKeys,
    optional,
    or,
    ShapeDefinition,
    ShapeToRuntimeType,
    unknownShape,
} from 'object-shape-tester';
import type {IsEqual} from 'type-fest';
import {assertValidEndpointPath, EndpointPathBase} from '../endpoint/endpoint-path.js';
import {MinimalService} from '../service/minimal-service.js';
import {ensureServiceDefinitionError} from '../service/service-definition.error.js';
import {NoParam} from '../util/no-param.js';
import {OriginRequirement, originRequirementShape} from '../util/origin.js';
import type {BaseSearchParams} from '../util/search-params.js';

/**
 * Initialization for a WebSocket within a service definition..
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WebSocketInit<MessageFromClientShape = unknown, MessageFromServerShape = unknown> = {
    messageFromClientShape: MessageFromClientShape;
    messageFromHostShape: MessageFromServerShape;
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
     * A shape (that is parsed by the
     * [`object-shape-tester`](https://www.npmjs.com/package/object-shape-tester) package) that all
     * protocols for this WebSocket are collectively tested against. Omit this or set it to
     * `undefined` to allow a string array of any length.
     *
     * This shape will be tested against all protocols together in a single array, so this should be
     * an array shape. Only string-compatible values inside the array will work. It is recommended
     * to use `tupleShape` from the `object-shape-tester` package.
     *
     * @example
     *
     * ```ts
     * import {tupleShape, exact} from 'object-shape-tester';
     *
     * const partialWebSocketInit = {
     *     protocolsShape: tupleShape('', exact('hi')),
     * };
     * ```
     */
    protocolsShape?: unknown;
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
     * import {exact, enumShape, tupleShape} from 'object-shape-tester';
     *
     * const partialWebSocketInit = {
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

    /** Attach any other properties that you want inside of here. */
    customProps?: Record<PropertyKey, unknown> | undefined;
};

/**
 * Adds final props to a {@link WebSocketInit}, converting it into a {@link WebSocketDefinition}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WithFinalWebSocketProps<
    Init,
    WebSocketPath extends EndpointPathBase,
> = (Init extends AnyObject
    ? Overwrite<
          Init,
          {
              messageFromClientShape: IsEqual<Init['messageFromClientShape'], NoParam> extends true
                  ? any
                  : Init['messageFromClientShape'] extends NoParam
                    ? ShapeDefinition<any, true> | undefined
                    : undefined extends Init['messageFromClientShape']
                      ? undefined
                      : ShapeDefinition<Init['messageFromClientShape'], true>;
              messageFromHostShape: IsEqual<Init['messageFromHostShape'], NoParam> extends true
                  ? any
                  : Init['messageFromHostShape'] extends NoParam
                    ? ShapeDefinition<any, true> | undefined
                    : undefined extends Init['messageFromHostShape']
                      ? undefined
                      : ShapeDefinition<Init['messageFromHostShape'], true>;
              MessageFromClientType: Init['messageFromClientShape'] extends NoParam
                  ? any
                  : undefined extends Init['messageFromClientShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<Init['messageFromClientShape'], true>,
                          false,
                          true
                      >;
              MessageFromHostType: Init['messageFromHostShape'] extends NoParam
                  ? any
                  : undefined extends Init['messageFromHostShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<Init['messageFromHostShape'], true>,
                          false,
                          true
                      >;
              protocolsShape: 'protocolsShape' extends keyof Init
                  ? undefined extends Init['protocolsShape']
                      ? undefined
                      : ShapeDefinition<Init['protocolsShape'], true> | undefined
                  : undefined;
              ProtocolsType: undefined extends Init['protocolsShape']
                  ? string[]
                  : ShapeToRuntimeType<ShapeDefinition<Init['protocolsShape'], true>, false, true>;
              searchParamsShape: 'searchParamsShape' extends keyof Init
                  ? undefined extends Init['searchParamsShape']
                      ? undefined
                      : ShapeDefinition<Init['searchParamsShape'], true> | undefined
                  : undefined;
              SearchParamsType: IsEqual<Init['searchParamsShape'], undefined> extends true
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
    path: WebSocketPath;
    isWebSocket: true;
    isEndpoint: false;
    service: MinimalService;
};

/**
 * A finished REST server WebSocket definition. This is generated from `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WebSocketDefinition<
    MessageFromClientShape = NoParam,
    MessageFromServerShape = NoParam,
    WebSocketPath extends EndpointPathBase = EndpointPathBase,
> = WithFinalWebSocketProps<
    WebSocketInit<MessageFromClientShape, MessageFromServerShape>,
    WebSocketPath
>;

/**
 * A generic version of {@link WebSocketDefinition} that any WebSocketDefinition can be assigned to.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type GenericWebSocketDefinition = Overwrite<
    WebSocketDefinition,
    {
        protocolsShape: any;
        ProtocolsType: any;
        searchParamsShape: any;
        SearchParamsType: any;
    }
>;

/**
 * Shape definition for {@link WebSocketInit}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export const webSocketInitShape = defineShape({
    messageFromClientShape: unknownShape(),
    messageFromHostShape: unknownShape(),
    searchParamsShape: unknownShape(),
    /**
     * Set a required client origin for this WebSocket.
     *
     * - If this is omitted, the service's origin requirement is used instead.
     * - If this is explicitly set to `undefined`, this endpoint allows any origins (regardless of the
     *   service's origin requirement).
     * - Any other set value overrides the service's origin requirement (if it has any).
     */
    requiredClientOrigin: originRequirementShape,
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
    protocolsShape: unknownShape(),
} satisfies Record<keyof WebSocketInit, any>);

/**
 * Attaches message type-only getters to a WebSocket definition.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function attachWebSocketShapeTypeGetters<const T extends AnyObject>(
    webSocketDefinition: T,
): asserts webSocketDefinition is T &
    Pick<WebSocketDefinition, 'MessageFromClientType' | 'MessageFromHostType'> {
    Object.defineProperties(webSocketDefinition, {
        MessageFromClientType: {
            enumerable: false,
            get(): any {
                throw new Error('.MessageFromClientType should not be used as a value.');
            },
        },
        MessageFromHostType: {
            enumerable: false,
            get(): any {
                throw new Error('.MessageFromHostType should not be used as a value.');
            },
        },
        ProtocolsType: {
            enumerable: false,
            get(): any {
                throw new Error('.ProtocolsType should not be used as a value.');
            },
        },
    } satisfies Partial<Record<keyof GenericWebSocketDefinition, unknown>>);
}

/**
 * Asserts the the WebSocket definition is valid.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function assertValidWebSocketDefinition(
    webSocketDefinition: Readonly<
        SelectFrom<
            WebSocketDefinition,
            {
                isEndpoint: true;
                isWebSocket: true;
                path: true;
                service: {
                    serviceName: true;
                };
            }
        >
    >,
) {
    try {
        assertValidEndpointPath(webSocketDefinition.path);
    } catch (error) {
        throw ensureServiceDefinitionError(error, {
            serviceName: webSocketDefinition.service.serviceName,
            ...webSocketDefinition,
        });
    }
}
