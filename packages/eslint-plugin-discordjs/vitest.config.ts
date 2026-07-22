import { createVitestConfig } from '@seedcord/vitest-config';

export default createVitestConfig(import.meta.url, {
    test: {
        // each type-aware test builds a TS program, and prePush runs every suite in parallel
        testTimeout: 60_000
    }
});
