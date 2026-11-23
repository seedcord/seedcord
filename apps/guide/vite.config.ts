import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    }
});
