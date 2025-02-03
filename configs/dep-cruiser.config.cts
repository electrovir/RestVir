import {defineConfig} from '@virmator/deps/configs/dep-cruiser.config.base';
import {type IConfiguration} from 'dependency-cruiser';

const baseConfig = defineConfig({
    fileExceptions: {
        // enter file exceptions by rule name here
        'no-orphans': {
            from: [
                'src/index.ts',
            ],
        },
        /** For some reason dep-cruiser thinks these deps are unresolvable (they're not). */
        'not-to-unresolvable': {
            to: [
                'typedoc',
            ],
        },
    },
    omitRules: [
        // enter rule names here to omit
    ],
});

const depCruiserConfig: IConfiguration = {
    ...baseConfig,
};

module.exports = depCruiserConfig;
