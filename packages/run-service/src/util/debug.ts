import {defaultServiceLogger, type GenericServiceImplementation} from '@rest-vir/implement-service';

export function applyDebugLogger(
    debug: undefined | boolean,
    service: Pick<GenericServiceImplementation, 'logger'>,
) {
    if (!debug) {
        return;
    }

    service.logger = defaultServiceLogger;
}
