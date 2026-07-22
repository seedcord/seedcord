import { createVitestConfig } from '@seedcord/vitest-config';

export default createVitestConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 10_000,
        globalSetup: './tests/utils/globalSetup.ts',
        fileParallelism: false
    }
});
