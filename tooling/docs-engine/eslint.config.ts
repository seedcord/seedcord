import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    userConfigs: [
        {
            rules: {
                'no-console': 'off'
            }
        }
    ]
});
