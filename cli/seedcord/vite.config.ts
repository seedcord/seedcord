import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'node'
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/workerd.index.ts', 'src/cli.ts'],
        format: ['esm'],
        deps: {
            neverBundle: true,
            alwaysBundle: [
                '@seedcord/brand',
                '@seedcord/cli-prompts',
                /^@seedcord\/cli-templates/,
                '@seedcord/docs-search',
                /^@seedcord\/ui/
            ]
        }
    })
});
