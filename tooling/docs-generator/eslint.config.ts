import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    // generated declarations the test harness emits for the mock fixture
    generalIgnores: ['tests/mock/dist/**'],
    userConfigs: [
        {
            rules: {
                'no-console': 'off'
            }
        }
    ]
});
