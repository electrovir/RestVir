import {myServiceImplementation} from '@rest-vir/implement-service/src/examples/my-service.example.js';
import {startService} from '../index.js';

await startService(myServiceImplementation, {
    port: 3000,
});
