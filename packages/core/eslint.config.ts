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
            // the rule is off here because fixtures build the old embed style on purpose
            files: ['tests/**/*.ts'],
            rules: {
                'discordjs/prefer-v2-component': 'off'
            }
        }
    ]
});
