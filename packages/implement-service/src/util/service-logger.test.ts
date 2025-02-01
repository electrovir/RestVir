import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {RestVirHandlerError} from './handler.error.js';
import {createServiceLogger, defaultServiceLogger, silentServiceLogger} from './service-logger.js';

describe('defaultServiceLogger', () => {
    it('logs errors without issue', () => {
        defaultServiceLogger.error(new Error('fake error'));
        defaultServiceLogger.error(
            new RestVirHandlerError(
                {
                    path: '/fake-path',
                    service: {
                        serviceName: 'fake service',
                    },
                    endpoint: true,
                    socket: false,
                },
                'fake error',
            ),
        );
    });
});

describe(createServiceLogger.name, () => {
    it('sets undefined to the silent logger', () => {
        const {error, info} = createServiceLogger({
            error: undefined,
            info: undefined,
        });
        assert.strictEquals(error, silentServiceLogger.error);
        assert.strictEquals(info, silentServiceLogger.info);
    });
    it('overrides the default logger', () => {
        function customError(error: Error) {}

        const {error, info} = createServiceLogger({
            error: customError,
        });
        assert.strictEquals(error, customError);
        assert.strictEquals(info, defaultServiceLogger.info);
    });
});
