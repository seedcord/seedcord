import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        globals: true,
        environment: 'node',
        testTimeout: 10_000,
        setupFiles: ['./tests/setup.ts']
    }),
    pack: createTsdownConfig({ entry: ['src/index.ts'] })
});
