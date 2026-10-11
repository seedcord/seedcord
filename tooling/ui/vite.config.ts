import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: createTsdownConfig({
        entry: ['src/**/*.{ts,tsx}'],
        format: ['esm'],
        platform: 'neutral',
        shims: false,
        target: 'esnext',
        dts: true,
        unbundle: true
    })
});
