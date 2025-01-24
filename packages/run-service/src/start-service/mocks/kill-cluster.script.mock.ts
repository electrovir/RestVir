import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock';
import {startService} from '../start-service.js';

const {cluster, kill} = await startService(mockServiceImplementation, {
    port: 3000,
    workerCount: 3,
    preventWorkerRespawn: true,
});

if (cluster) {
    setTimeout(() => {
        kill();
    }, 3000);
}
