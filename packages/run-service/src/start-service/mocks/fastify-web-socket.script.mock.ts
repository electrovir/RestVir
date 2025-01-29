/* node:coverage disable */
/* eslint-disable */

import fastifyWs from '@fastify/websocket';
import fastify from 'fastify';

const server = fastify();

await server.register(fastifyWs);
server.get('/', {websocket: true}, (socket /* WebSocket */, req /* FastifyRequest */) => {
    console.log('got web socket connection');
    socket.on('message', (message: any) => {
        console.log(String(message));
        // message.toString() === 'hi from client'
        socket.send('hi from server');
    });
});

server.get('/index.html', (request, response) => {
    response.headers({
        'content-type': 'text/html',
    });
    return /* HTML */ `
        <html>
            <head>
                <script>
                    const webSocket = new WebSocket('ws://localhost:3000/');
                    webSocket.addEventListener('message', (message) => {
                        console.log(message);
                    });
                    console.log(webSocket);
                    setTimeout(() => {
                        webSocket.send('init');
                    }, 1000);
                </script>
            </head>
            <body>
                Hi
            </body>
        </html>
    `;
});

server.listen({port: 3000}, (err) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    } else {
        console.log('server listening');
    }
});
