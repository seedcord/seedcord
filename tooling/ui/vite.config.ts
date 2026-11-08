import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    },
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
