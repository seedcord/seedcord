import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    // oxc's default JSX runtime is classic
    oxc: { jsx: { runtime: 'automatic' } },
    test: createTestConfig({
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    })
});
