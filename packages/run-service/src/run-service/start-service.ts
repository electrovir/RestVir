import type {ServiceImplementation} from '@rest-vir/implement-service';
import {Server} from 'hyper-express';
import {getPortPromise} from 'portfinder';
import {attachService} from './attach-service.js';
import {finalizeOptions, StartServiceUserOptions} from './run-service-options.js';

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
     * server](https://www.npmjs.com/package/hyper-express).
     */
    server: Server;
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
    service: Readonly<ServiceImplementation>,
    userOptions: Readonly<StartServiceUserOptions>,
): Promise<StartServiceOutput> {
    const options = finalizeOptions(userOptions);
    const finalizedPort = options.lockPort
        ? options.port
        : await getPortPromise({
              port: options.port,
          });

    const server = new Server();

    attachService(server, service);

    await server.listen(finalizedPort);

    return {
        port: finalizedPort,
        server,
    };
}
