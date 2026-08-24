import { createVitestConfig } from '@seedcord/vitest-config';

export default createVitestConfig(import.meta.url, {
    // oxc's default JSX runtime is classic
    oxc: { jsx: { runtime: 'automatic' } },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    }
});
