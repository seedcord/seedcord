import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    }),
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
