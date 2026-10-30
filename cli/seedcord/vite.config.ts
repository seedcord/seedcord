import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        globals: true,
        environment: 'node'
    }),
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/workerd.index.ts', 'src/cli.ts'],
        format: ['esm'],
        deps: { neverBundle: true, alwaysBundle: ['@seedcord/cli-prompts', /^@seedcord\/cli-templates/] }
    })
});
