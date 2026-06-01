import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    // Built declarations the test harness emits for the mock fixture; not source.
    generalIgnores: ['tests/mock/dist/**'],
    userConfigs: [
        {
            rules: {
                'no-console': 'off'
            }
        }
    ]
});
