import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    test: {
        environment: 'node',
        testTimeout: 10_000
    }
});
