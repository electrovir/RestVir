import {mockService} from '../service/define-service.mock.js';
import {generateApi} from './generate-api.js';

export const mockServiceApi = generateApi(mockService);
