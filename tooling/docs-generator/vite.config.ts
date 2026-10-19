import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        globals: true,
        environment: 'node',
        testTimeout: 10_000,
        globalSetup: './tests/utils/globalSetup.ts',
        fileParallelism: false
    }),
    pack: createTsdownConfig({ entry: ['src/index.ts', 'src/manifest-fields.ts', 'src/RuntimeBuild.ts'] })
});
