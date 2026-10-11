import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/workerd.index.ts', 'src/cli.ts'],
        format: ['esm']
    })
});
