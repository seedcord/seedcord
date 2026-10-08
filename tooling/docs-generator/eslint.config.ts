import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    // output the test harness writes for the mock fixtures
    generalIgnores: ['tests/mock/dist/**', 'tests/mock/node_modules/**', 'tests/mock-base/dist/**'],
    userConfigs: [
        {
            rules: {
                'no-console': 'off'
            }
        }
    ]
});
