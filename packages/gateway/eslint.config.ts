import createConfig from '@seedcord/eslint-config';
import { proseConfig } from '@seedcord/prose';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    registerDiscordjsPlugin: true,
    registerSeedcordPlugin: true,
    userConfigs: [
        ...proseConfig,
        {
            // framework tests build unwired fixture classes on purpose
            files: ['tests/**/*.ts'],
            rules: {
                '@seedcord/command-builder-missing-register-command': 'off',
                '@seedcord/event-handler-missing-register-event': 'off',
                '@seedcord/interaction-handler-missing-route': 'off',
                '@seedcord/middleware-missing-register-decorator': 'off',
                '@seedcord/no-raw-client-events': 'off',
                '@seedcord/use-custom-id-codec': 'off'
            }
        }
    ]
});
