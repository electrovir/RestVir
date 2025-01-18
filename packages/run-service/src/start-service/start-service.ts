import {check} from '@augment-vir/assert';
import {EndpointPathBase, ServiceDefinition} from '@rest-vir/define-service';
import {
    ContextInit,
    EndpointFinder,
    EndpointImplementation,
    ExtractAuth,
    ServiceLogger,
    type ServiceImplementation,
} from '@rest-vir/implement-service';
import {ClusterManager, runInCluster} from 'cluster-vir';
import {Server} from 'hyper-express';
import {getPortPromise} from 'portfinder';
import {attachService} from './attach-service.js';
import {finalizeOptions, StartServiceUserOptions} from './start-service-options.js';

/**
 * Output of {@link startService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type StartServiceOutput = {
    /**
     * The port that the server actually started on. This depends on the options given to
     * {@link startService}.
     */
    port: number;
    /**
     * The instantiated and running [`hyper-express`
     * server](https://www.npmjs.com/package/hyper-express). This is populated when the server is
     * run on only a single thread (when `options.workerCount` is 1).
     */
    server?: Server;
    /**
     * The `ClusterManager` for all the spawned server workers. This is populated when the server is
     * run with a multiple threads (when `options.workerCount` > 1).
     */
    clusterManager?: ClusterManager;
    /** A function that will kill the service even if it's using multiple workers. */
    kill: () => void;
};

/**
 * Output of {@link startService}.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type GenericServiceImplementation = ServiceDefinition & {
    implementations: Record<EndpointPathBase, EndpointImplementation<any, any, any>>;
    context: ContextInit<any>;
    extractAuth: ExtractAuth<any, any> | undefined;
    logger: ServiceLogger;
    getEndpointPath: EndpointFinder;
};

/**
 * Starts the given {@link ServiceImplementation} inside of a backend [`hyper-express`
 * server](https://www.npmjs.com/package/hyper-express).
 *
 * To freely use a service implementation inside of any kind of server (not just `hyper-express`),
 * instead use {@link attachService}.
 *
 * @category Run Service
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export async function startService(
    service: Readonly<GenericServiceImplementation>,
    userOptions: Readonly<StartServiceUserOptions>,
): Promise<StartServiceOutput> {
    const options = finalizeOptions(userOptions);
    options.port = options.lockPort
        ? options.port
        : await getPortPromise({
              port: options.port,
          });

    if (options.workerCount === 1) {
        /** Only run a single server. */
        const result = await startHyperExpressService(service, options.port);

        service.logger.info(`${service.serviceName} started on http://localhost:${options.port}`);

        return result;
    } else {
        /** Run in a cluster. */
        const manager = runInCluster(
            async () => {
                const {kill} = await startHyperExpressService(service, options.port);

                return () => {
                    kill();
                };
            },
            {
                startWorkersImmediately: false,
                respawnWorkers: true,
                workerCount: options.workerCount,
            },
        );

        if (check.instanceOf(manager, ClusterManager)) {
            await manager.startWorkers();
            service.logger.info(
                `${service.serviceName} started on http://localhost:${options.port}`,
            );

            return {
                port: options.port,
                clusterManager: manager,
                kill() {
                    manager.destroy();
                },
            };
        } else {
            return {
                port: options.port,
                kill() {
                    manager.destroy();
                },
            };
        }
    }
}

async function startHyperExpressService(
    service: Readonly<ServiceImplementation>,
    port: number,
): Promise<StartServiceOutput> {
    const server = new Server();

    attachService(server, service);

    await server.listen(port);

    return {
        port,
        server,
        kill() {
            server.close();
        },
    };
}
