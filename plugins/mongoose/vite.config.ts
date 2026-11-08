import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 10_000,
        setupFiles: ['./tests/setup.ts']
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts']
    })
});
