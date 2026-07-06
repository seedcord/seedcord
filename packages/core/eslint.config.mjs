import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerDiscordjsPlugin: true,
    registerSeedcordPlugin: true,
    userConfigs: [
        {
            // fixtures for the embed component type
            files: ['tests/**/*.ts'],
            rules: {
                'discordjs/prefer-v2-component': 'off'
            }
        }
    ]
});
