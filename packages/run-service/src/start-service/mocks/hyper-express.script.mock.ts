import {Server} from 'hyper-express';

const server = new Server();

server.get('/derp', (request, response, next) => {
    console.log(request.originalUrl);
    console.log(request.baseUrl);

    console.log('got derp');
    response.sendStatus(200);
});

const result = await server.listen(3000);

console.log(Object.keys(result));

console.log('listening on http://localhost:3000');
