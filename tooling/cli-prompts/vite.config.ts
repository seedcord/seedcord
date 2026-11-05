import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        environment: 'node',
        testTimeout: 10_000
    }),
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/testing.ts']
    })
});
