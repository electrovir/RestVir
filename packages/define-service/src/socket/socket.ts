import {AnyObject, extractErrorMessage, Overwrite} from '@augment-vir/common';
import {defineShape, ShapeDefinition, unknownShape} from 'object-shape-tester';
import type {IsEqual} from 'type-fest';
import {assertValidEndpointPath, EndpointPathBase} from '../endpoint/endpoint-path.js';
import {MinimalService} from '../service/minimal-service.js';
import {ServiceDefinitionError} from '../service/service-definition.error.js';
import {NoParam} from '../util/no-param.js';
import {OriginRequirement, originRequirementShape} from '../util/origin.js';

/**
 * Initialization for a socket within a service definition..
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type SocketInit<MessageDataShape = unknown> = {
    messageDataShape: MessageDataShape;
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
 * Adds final props to a {@link SocketInit}, converting it into a {@link Socket}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type WithFinalSocketProps<T, SocketPath extends EndpointPathBase> = (T extends AnyObject
    ? Overwrite<
          T,
          {
              messageDataShape: IsEqual<T['messageDataShape'], NoParam> extends true
                  ? any
                  : T['messageDataShape'] extends NoParam
                    ? ShapeDefinition<any, true> | undefined
                    : undefined extends T['messageDataShape']
                      ? undefined
                      : ShapeDefinition<T['messageDataShape'], true>;
              MessageType: T['messageDataShape'] extends NoParam
                  ? any
                  : undefined extends T['messageDataShape']
                    ? undefined
                    : ShapeDefinition<T['messageDataShape'], false>['runtimeType'];
          }
      >
    : never) & {
    socketPath: SocketPath;
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
    MessageDataShape = NoParam,
    SocketPath extends EndpointPathBase = EndpointPathBase,
> = WithFinalSocketProps<SocketInit<MessageDataShape>, SocketPath>;

/**
 * Shape definition for {@link SocketInit}.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export const socketInitShape = defineShape({
    messageDataShape: unknownShape(),
    /**
     * Set a required client origin for this socket.
     *
     * - If this is omitted, the service's origin requirement is used instead.
     * - If this is explicitly set to `undefined`, this endpoint allows any origins (regardless of the
     *   service's origin requirement).
     * - Any other set value overrides the service's origin requirement (if it has any).
     */
    requiredOrigin: originRequirementShape,
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
): asserts socket is T & Pick<Socket, 'MessageType'> {
    Object.defineProperties(socket, {
        MessageType: {
            enumerable: false,
            get(): any {
                throw new Error('.MessageType should not be used as a value.');
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
    socket: Readonly<Pick<Socket, 'socketPath'>>,
    {
        serviceName,
    }: {
        /**
         * `serviceName` is used purely for error messaging purposes, so that it's possible to
         * understand which service the socket is coming from.
         */
        serviceName: string | NoParam;
    },
) {
    try {
        assertValidEndpointPath(socket.socketPath);
    } catch (caught) {
        /* node:coverage ignore next 3: just covering an edge case */
        if (caught instanceof ServiceDefinitionError) {
            throw caught;
        } else {
            throw new ServiceDefinitionError({
                path: socket.socketPath,
                serviceName,
                errorMessage: extractErrorMessage(caught),
                routeType: 'socket',
            });
        }
    }
}
