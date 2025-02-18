# rest-vir

`rest-vir` is a collection of packages that allows you to define your own REST service with round-trip type safe endpoints and WebSockets. It also includes the following features:

-   a single source of truth for shipped API documentation and types
-   browser-friendly API exports _without any build steps_
-   type safe endpoint fetching and WebSocket messaging both in clients (browsers) and hosts (servers)
-   separate server implementations to keep browser code and server code separate
-   automatic API entry point that can be shipped to internal and external users
-   extensive testing utilities for both frontend and backend unit and integration testing

See the full reference docs at https://electrovir.github.io/rest-vir

## Usage

1. [Define a service](#service-definition)
2. [Implement a service](#service-implementation)
3. [Run a service](#start-service)
4. [Connect to the service in your client (frontend)](#client-frontend-connection)
5. [Export an api](#export-an-api)

### Service Definition

In code shared between your frontend and backend, install `npm i @rest-vir/define-service` and then define your service:

```TypeScript
import {AnyOrigin, defineService, HttpMethod} from '@rest-vir/define-service';

export const myService = defineService({
    /** The name of your service. This will be visible to all consumers of this service definition. */
    serviceName: 'my-service',
    /**
     * The origin at which the service will be hosted. Fetch requests and WebSocket connections will
     * be sent to this service will be sent to this origin.
     *
     * It is recommended to use a ternary to switch between dev and prod origins.
     */
    serviceOrigin: isDev ? 'http://localhost:3000' : 'https://example.com',
    /**
     * The service's `origin` requirement for all endpoint requests and WebSocket connections. This
     * is used for CORS handshakes.
     *
     * This can be a string, a RegExp, a function, or an array of any of those. (If this is an
     * array, the first matching array element will be used.)
     *
     * Set this to `AnyOrigin` (imported from `'@rest-vir/define-service'`) to allow any origins.
     * Make sure that you're okay with the security impact this may have on your users of doing so.
     */
    requiredClientOrigin: AnyOrigin,
    endpoints: {
        '/my-endpoint': {
            /** This endpoint requires all requests to contain a string body. */
            requestDataShape: '',
            /** This endpoint's response body will always be empty. */
            responseDataShape: undefined,

            methods: {
                [HttpMethod.Post]: true,
            },
        },
        /** Express-style path params are allowed. */
        '/my-endpoint/:user-id': {
            /** This endpoint expects no request body data. */
            requestDataShape: undefined,
            /**
             * This endpoint will always response with data that matches:
             *
             *     {
             *         username: string,
             *         firstName: string,
             *         lastName: string
             *     }
             */
            responseDataShape: {
                username: '',
                firstName: '',
                lastName: '',
            },
            methods: {
                [HttpMethod.Get]: true,
            },
            /** Each endpoint may override the service's origin requirement. */
            requiredClientOrigin: 'https://example.com',
        },
    },
    webSockets: {
        '/my-web-socket': {
            /** This WebSocket requires all messages from the client to be a string. */
            messageFromClientShape: '',
            /** Same for messages from the host. */
            messageFromHostShape: '',
        },
    },
});
```

### Service Implementation

In your backend code, install `npm i @rest-vir/implement-service` and implement your service endpoints and WebSockets:

```TypeScript
import {HttpStatus, implementService} from '@rest-vir/implement-service';

export const myServiceImplementation = implementService(
    {
        service: myService,
    },
    {
        endpoints: {
            '/my-endpoint'() {
                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            async '/my-endpoint/:user-id'({pathParams}) {
                const user = await readUserFromDatabase(pathParams['user-id']);

                return {
                    statusCode: HttpStatus.Ok,
                    responseData: user,
                };
            },
        },
        webSockets: {
            '/my-web-socket': {
                onMessage({webSocket}) {
                    webSocket.send('hi!');
                },
            },
        },
    },
);
```

### Start service

In your backend code's startup script, install `npm i @rest-vir/run-service` run the service:

```TypeScript
import {startService} from '@rest-vir/run-service';

await startService(myServiceImplementation, {
    port: 3000,
});
```

You can also attach your service to an existing server:

```TypeScript
import {myServiceImplementation} from '@rest-vir/implement-service/src/examples/my-service.example.js';
import fastify from 'fastify';
import {attachService} from '../index.js';

const server = fastify();

await attachService(server, myServiceImplementation);

await server.listen({port: 3000});
```

### Client (frontend) connection

In your frontend code, you can send fetch requests and WebSocket connections to the service:

```TypeScript
import {connectWebSocket, fetchEndpoint} from '@rest-vir/define-service';

const response = await fetchEndpoint(myService.endpoints['/my-endpoint'], {
    /** `requestData` is enforced by `myService`'s types. */
    requestData: 'hello there',
});

const webSocket = await connectWebSocket(myService.webSockets['/my-web-socket'], {
    listeners: {
        message({
            /** This `message` is type safe. */
            message,
        }) {
            console.info('message received from server:', message);
        },
    },
});

/** `.send()`'s input is enforced by `myService`'s types. */
webSocket.send('hello there');
```

### Export an API

You can publish a wrapped API object with `@rest-vir/define-service`:

```TypeScript
import {generateApi} from '@rest-vir/define-service';

export const myApi = generateApi(myService);
```
