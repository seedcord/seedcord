import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    }
});
