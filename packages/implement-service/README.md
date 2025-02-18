# @rest-vir/implement-service

Part of the rest-vir suite. This package is used for implementing a REST service already defined by [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service).

See the full docs at https://electrovir.github.io/rest-vir

## Installation

```sh
npm i @rest-vir/implement-service
```

## Usage

Implement your service:

```TypeScript
import {HttpStatus, implementService} from '@rest-vir/implement-service';

export const myServiceImplementation = implementService(
    {
        service: myServiceDefinition,
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
