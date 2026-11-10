import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/workerd.index.ts', 'src/cli.ts'],
        deps: {
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
