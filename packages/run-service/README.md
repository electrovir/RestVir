# @rest-vir/run-service

Part of the rest-vir suite. This package is used for running a REST service already defined by [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service) and implemented by [`@rest-vir/implement-service`](https://www.npmjs.com/package/@rest-vir/implement-service).

See the full docs at https://electrovir.github.io/rest-vir

## Installation

```sh
npm i @rest-vir/run-service
```

## Usage

Run your service:

```TypeScript
import {startService} from '@rest-vir/run-service';

await startService(myServiceImplementation, {
    port: 3000,
});
```
