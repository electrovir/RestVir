import {check} from '@augment-vir/assert';
import type {SelectFrom} from '@augment-vir/common';
import {
    type GenericServiceImplementation,
    type ServiceImplementation,
} from '@rest-vir/implement-service';
import {ClusterManager, runInCluster, type WorkerRunner} from 'cluster-vir';
import fastify, {type FastifyInstance} from 'fastify';
import {getPortPromise} from 'portfinder';
import {attachService} from './attach-service.js';
import {
    finalizeOptions,
    StartServiceOptions,
    StartServiceUserOptions,
} from './start-service-options.js';

/**
 * Output of {@link startService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type StartServiceOutput<Port extends number | false> = {
    /**
     * The port that the server actually started on. This depends on the options given to
     * {@link startService}.
     */
    port: Port extends boolean ? undefined : number;
    /**
     * The host that the server was attached to. (This is simply passed directly from the user
     * options, merged with the default.)
     */
    host: string;
    /**
     * The instantiated and running [`fastify`](https://www.npmjs.com/package/fastify) instance.
     * This is populated when the server is run on only a single thread (when `options.workerCount`
     * is 1).
     */
    server?: FastifyInstance;
    /**
     * The `ClusterManager` for all the spawned server workers. This is populated when the server is
     * run with a multiple threads (when `options.workerCount` > 1). It will only be populated for
     * the primary thread.
     */
    cluster?: ClusterManager;
    /**
     * The `WorkerRunner` for the current worker. This is populated when the server is run with a
     * multiple threads (when `options.workerCount` > 1). It will only be populated for non-primary
     * threads.
     */
    worker?: WorkerRunner;
    /** A function that will kill the service even if it's using multiple workers. */
    kill: () => void;
};

/**
 * Starts the given {@link ServiceImplementation} inside of a backend [Fastify
 * server](https://www.npmjs.com/package/fastify).
 *
 * To attach the service endpoint handlers to an existing Fastify server, use {@link attachService}.
 *
 * @category Run Service
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function startService<const Port extends number | false>(
    service: Readonly<
        SelectFrom<
            GenericServiceImplementation,
            {
                endpoints: true;
                serviceName: true;
                logger: true;
            }
        >
    >,
    userOptions: Readonly<StartServiceUserOptions<Port>>,
): Promise<StartServiceOutput<Port>> {
    const options = finalizeOptions(userOptions);

    const port: number | boolean =
        options.lockPort || check.isFalse(options.port)
            ? options.port
            : await getPortPromise({
                  port: options.port,
              });
    options.port = port as Port;

    if (options.workerCount === 1 || !check.isNumber(port)) {
        /** Only run a single server. */
        const result = await startServer(service, options);

        service.logger.info(`${service.serviceName} started on http://localhost:${options.port}`);

        return result;
    } else {
        /** Run in a cluster. */
        const manager = runInCluster(
            async () => {
                const {kill} = await startServer(service, options);

                return () => {
                    kill();
                };
            },
            {
                startWorkersImmediately: false,
                respawnWorkers: !options.preventWorkerRespawn,
                workerCount: options.workerCount,
            },
        );

        if (check.instanceOf(manager, ClusterManager)) {
            await manager.startWorkers();
            service.logger.info(
                `${service.serviceName} started on http://localhost:${options.port}`,
            );

            return {
                host: options.host,
                port: port as StartServiceOutput<Port>['port'],
                cluster: manager,
                kill() {
                    manager.destroy();
                },
            };
        } else {
            return {
                host: options.host,
                port: port as StartServiceOutput<Port>['port'],
                worker: manager,
                kill() {
                    manager.destroy();
                },
            };
        }
    }
}

async function startServer<const Port extends number | false>(
    service: Readonly<
        SelectFrom<
            ServiceImplementation,
            {
                endpoints: true;
            }
        >
    >,
    {host, port}: Readonly<Pick<StartServiceOptions<Port>, 'host' | 'port'>>,
): Promise<StartServiceOutput<Port>> {
    const server = fastify();

    attachService(server, service);

    if (check.isNumber(port)) {
        await server.listen({port, host});
    }

    return {
        host,
        port: (check.isNumber(port) ? port : undefined) as StartServiceOutput<Port>['port'],
        server,
        kill() {
            server.server.close();
        },
    };
}
