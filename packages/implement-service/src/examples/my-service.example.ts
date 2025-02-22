import {myService} from '@rest-vir/define-service/src/examples/my-service.example.js';
import {HttpStatus, implementService} from '../index.js';

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
                message({webSocket}) {
                    webSocket.send('hi!');
                },
            },
        },
    },
);
