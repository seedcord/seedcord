import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerDiscordjsPlugin: true,
    registerSeedcordPlugin: true,
    userConfigs: [
        {
            // fixtures build the old embed style on purpose, so the rule would flag them
            files: ['tests/**/*.ts'],
            rules: {
                'discordjs/prefer-v2-component': 'off'
            }
        }
    ]
});
