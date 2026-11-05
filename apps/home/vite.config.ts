import { defineConfig } from 'vite-plus';
import { createTestConfig } from '@seedcord/vitest-config';

export default defineConfig({
    // oxc reads the Next apps' jsx: preserve as the classic runtime
    oxc: { jsx: { runtime: 'automatic' } },
    test: createTestConfig()
});
