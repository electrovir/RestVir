import {generateApi} from '../index.js';
import {myService} from './my-service.example.js';

export const myApi = generateApi(myService);
