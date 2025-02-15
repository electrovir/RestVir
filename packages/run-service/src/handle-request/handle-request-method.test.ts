import {assert} from '@augment-vir/assert';
import {HttpMethod} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {mockService} from '@rest-vir/define-service/src/service/define-service.mock.js';
import {handleRequestMethod} from './handle-request-method.js';

describe(handleRequestMethod.name, () => {
    it('ignores options requests', () => {
        assert.isUndefined(
            handleRequestMethod({
                request: {
                    method: HttpMethod.Options,
                    originalUrl: 'some url',
                },
                route: {
                    ...mockService.endpoints['/empty'],
                    methods: {
                        /** Even this can't stop it. */
                        [HttpMethod.Options]: false,
                    },
                },
            }),
        );
    });
});
