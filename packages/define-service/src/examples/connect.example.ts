import {connectWebSocket, fetchEndpoint} from '../index.js';
import {myService} from './my-service.example.js';

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
