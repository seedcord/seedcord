import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        globals: true,
        environment: 'node',
        testTimeout: 15_000,
        globalSetup: './tests/utils/globalSetup.ts'
    }),
    pack: createTsdownConfig({ entry: ['src/index.ts', 'src/client.ts', 'src/workspace.ts'] })
});
