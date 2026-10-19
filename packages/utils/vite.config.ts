import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        setupFiles: ['./tests/setup.ts']
    }),
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/internal.index.ts', 'src/node.ts', 'src/node-internal.index.ts']
    })
});
