import { defineConfig } from 'vite-plus';
import { createTestConfig, OXC_OPTIONS } from '@seedcord/vitest-config';

export default defineConfig({
    oxc: OXC_OPTIONS,
    test: createTestConfig()
});
