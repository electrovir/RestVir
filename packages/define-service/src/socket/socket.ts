import {AnyObject, Overwrite, type SelectFrom} from '@augment-vir/common';
import {
    defineShape,
    indexedKeys,
    optional,
    or,
    unknownShape,
    type ShapeDefinition,
    type ShapeToRuntimeType,
} from 'object-shape-tester';
import type {IsEqual} from 'type-fest';
import {assertValidEndpointPath, EndpointPathBase} from '../endpoint/endpoint-path.js';
import {MinimalService} from '../service/minimal-service.js';
import {ensureServiceDefinitionError} from '../service/service-definition.error.js';
import {NoParam} from '../util/no-param.js';
import {OriginRequirement, originRequirementShape} from '../util/origin.js';

/**
 * Initialization for a socket within a service definition..
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type SocketInit<MessageFromClientShape = unknown, MessageFromServerShape = unknown> = {
    messageFromClientShape: MessageFromClientShape;
    messageFromServerShape: MessageFromServerShape;
    /**
     * Set a required client origin for this endpoint.
     *
     * - If this is omitted, the service's origin requirement is used instead.
     * - If this is explicitly set to `undefined`, this endpoint allows any origins (regardless of the
     *   service's origin requirement).
     * - Any other set value overrides the service's origin requirement (if it has any).
     */
    requiredClientOrigin?: OriginRequirement;

    customProps?: Record<PropertyKey, unknown> | undefined;
};

/**
 * Adds final props to a {@link SocketInit}, converting it into a {@link Socket}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WithFinalSocketProps<
    Init,
    SocketPath extends EndpointPathBase,
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
              messageFromServerShape: IsEqual<Init['messageFromServerShape'], NoParam> extends true
                  ? any
                  : Init['messageFromServerShape'] extends NoParam
                    ? ShapeDefinition<any, true> | undefined
                    : undefined extends Init['messageFromServerShape']
                      ? undefined
                      : ShapeDefinition<Init['messageFromServerShape'], true>;
              MessageFromClientType: Init['messageFromClientShape'] extends NoParam
                  ? any
                  : undefined extends Init['messageFromClientShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<Init['messageFromClientShape'], true>,
                          false,
                          true
                      >;
              MessageFromHostType: Init['messageFromServerShape'] extends NoParam
                  ? any
                  : undefined extends Init['messageFromServerShape']
                    ? undefined
                    : ShapeToRuntimeType<
                          ShapeDefinition<Init['messageFromServerShape'], true>,
                          false,
                          true
                      >;
              customProps: 'customProps' extends keyof Init ? Init['customProps'] : undefined;
          }
      >
    : never) & {
    path: SocketPath;
    socket: true;
    endpoint: false;
    service: MinimalService;
};

/**
 * A fully defined socket instance. This is generated from `defineService`.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type Socket<
    MessageFromClientShape = NoParam,
    MessageFromServerShape = NoParam,
    SocketPath extends EndpointPathBase = EndpointPathBase,
> = WithFinalSocketProps<SocketInit<MessageFromClientShape, MessageFromServerShape>, SocketPath>;

/**
 * Shape definition for {@link SocketInit}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export const socketInitShape = defineShape({
    messageFromClientShape: unknownShape(),
    messageFromServerShape: unknownShape(),
    /**
     * Set a required client origin for this socket.
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
} satisfies Record<keyof SocketInit, any>);

/**
 * Attaches message type-only getters to a socket definition.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function attachSocketShapeTypeGetters<const T extends AnyObject>(
    socket: T,
): asserts socket is T & Pick<Socket, 'MessageFromClientType' | 'MessageFromHostType'> {
    Object.defineProperties(socket, {
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
    });
}

/**
 * Asserts the the socket definition is valid.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function assertValidSocket(
    socket: Readonly<
        SelectFrom<
            Socket,
            {
                endpoint: true;
                socket: true;
                path: true;
                service: {
                    serviceName: true;
                };
            }
        >
    >,
) {
    try {
        assertValidEndpointPath(socket.path);
    } catch (error) {
        throw ensureServiceDefinitionError(error, {
            serviceName: socket.service.serviceName,
            ...socket,
        });
    }
}
