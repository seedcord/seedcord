import { defineConfig } from 'vite-plus';
import { createTestConfig } from '@seedcord/vitest-config';

export default defineConfig({
    // oxc reads the Next apps' jsx: preserve as the classic runtime
    oxc: { jsx: { runtime: 'automatic' } },
    test: createTestConfig({
        // these tests vi.mock docs' own modules, and a mock carries into the next file in a shared worker
        isolate: true,
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    })
});
