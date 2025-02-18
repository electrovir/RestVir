import {myServiceImplementation} from '@rest-vir/implement-service/src/examples/my-service.example.js';
import fastify from 'fastify';
import {attachService} from '../index.js';

const server = fastify();

await attachService(server, myServiceImplementation);

await server.listen({port: 3000});
