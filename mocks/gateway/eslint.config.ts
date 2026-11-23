import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerDiscordjsPlugin: true,
    registerSeedcordPlugin: true,
    generalIgnores: ['**/seedcord-gen.ts'],
    userConfigs: [
        {
            // the mock uses embed components on purpose
            files: ['src/components/**/*.ts'],
            rules: {
                'discordjs/prefer-v2-component': 'off'
            }
        }
    ]
});
