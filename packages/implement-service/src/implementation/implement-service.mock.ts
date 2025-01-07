/* node:coverage disable */

import {check} from '@augment-vir/assert';
import {HttpStatus, type AnyObject} from '@augment-vir/common';
import {mockService, MyMockAuth} from '@rest-vir/define-service/src/service/define-service.mock';
import {implementService} from './implement-service.js';

export type MockServiceContext = {
    date: number;
};

const mockServiceImplementation = implementService(
    mockService,
    {
        '/empty'() {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: undefined,
            };
        },
        '/missing'() {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: undefined,
            };
        },
        '/requires-admin'() {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: undefined,
            };
        },
        '/returns-error-status'() {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: undefined,
            };
        },
        '/returns-response-error'() {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: undefined,
            };
        },
        '/test'({requestData}) {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: {
                    requestData,
                    result: 4,
                },
            };
        },
        '/throws-error'() {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: undefined,
            };
        },
        '/with/:param1/:param2'() {
            return {
                statusCode: HttpStatus.Accepted,
                responseData: undefined,
            };
        },
    },
    {
        context(): MockServiceContext {
            return {
                date: Date.now(),
            };
        },
        extractAuth({request}) {
            const naiveAuth = request.headers.authorization;

            if (check.isEnumValue(naiveAuth, MyMockAuth)) {
                return naiveAuth;
            } else {
                return undefined;
            }
        },
    },
);

delete (mockServiceImplementation.implementations as AnyObject)['/missing'];
