import { createTsdownConfig } from '@seedcord/tsdown-config';
import { aliasFromTsconfig, createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

// required to resolve @seedcord/fixture-base
const alias = aliasFromTsconfig(import.meta.url);

export default defineConfig({
    resolve: { alias },
    test: createTestConfig({
        globals: true,
        environment: 'node',
        testTimeout: 10_000,
        globalSetup: './tests/utils/globalSetup.ts',
        fileParallelism: false
    }),
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/manifest-fields.ts', 'src/RuntimeBuild.ts']
    })
});
