import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: createTsdownConfig({
        entry: [
            'src/index.ts',
            'src/plugin.index.ts',
            'src/internal.index.ts',
            'src/hmr.index.ts',
            'src/node.index.ts',
            'src/node-internal.index.ts'
        ]
    })
});
