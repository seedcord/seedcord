import { createVitestConfig } from '@seedcord/vitest-config';

export default createVitestConfig(import.meta.url, {
    test: {
        environment: 'node',
        testTimeout: 20_000
    }
});
