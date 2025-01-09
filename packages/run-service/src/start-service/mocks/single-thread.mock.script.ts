import {mockServiceImplementation} from '@rest-vir/implement-service/src/implementation/implement-service.mock';
import {startService} from '../start-service.js';

await startService(mockServiceImplementation, {
    port: 3000,
    workerCount: 1,
});
