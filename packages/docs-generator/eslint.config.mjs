import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    userConfigs: [
        {
            rules: {
                'no-console': 'off'
            }
        },
        {
            files: ['tests/**/*.ts'],
            rules: {
                '@typescript-eslint/no-non-null-assertion': 'off',
                'max-nested-callbacks': ['warn', 5]
            }
        }
    ]
});
