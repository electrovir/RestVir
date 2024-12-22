# @rest-vir/define-service

Part of the rest-vir system. This package is used for defining a declarative and typed service.

## Installation

```sh
npm i @rest-vir/define-service
```

## Usage

The key export from this package is `defineService`. Use it to define a service and all of its endpoints.

Below is an example usage. See comments on the exported TypeScript types for more details.

<!-- example-link: src/examples/define-a-service.example.ts -->

```TypeScript
import {getEnumValues} from '@augment-vir/common';
import {defineService} from '../define-service.js';

export enum MyAuth {
    Admin = 'admin',
    Manager = 'manager',
    User = 'user',
}

export const myService = defineService({
    serviceName: 'my-service',
    allowedAuth: getEnumValues(MyAuth),
    /**
     * The origin at which the service will be hosted. Client requests sent to this service will be
     * sent to this origin.
     */
    serviceOrigin: 'https://example.com',
    endpoints: {
        '/my-endpoint': {
            requestDataShape: undefined,
            responseDataShape: undefined,
            requiredAuth: [MyAuth.Admin],
            requiredClientOrigin: undefined,
            methods: {
                GET: true,
            },
        },
        '/my-endpoint/:user-id': {
            requestDataShape: undefined,
            responseDataShape: {
                username: '',
                firstName: '',
                lastName: '',
            },
            requiredAuth: [
                MyAuth.Admin,
                MyAuth.Manager,
            ],
            methods: {
                GET: true,
            },
            requiredClientOrigin: 'https://my-website.com',
        },
    },
});
```
