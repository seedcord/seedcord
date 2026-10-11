import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    // every create call is a cold download
    pack: createTsdownConfig({
        entry: ['src/index.ts'],
        deps: { alwaysBundle: [/./], onlyBundle: false },
        format: ['esm'],
        dts: false
    })
});
