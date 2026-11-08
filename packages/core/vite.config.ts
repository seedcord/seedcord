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
        entry: [
            'src/index.ts',
            'src/plugin.index.ts',
            'src/internal.index.ts',
            'src/env-internal.index.ts',
            'src/node.index.ts',
            'src/node-internal.index.ts'
        ]
    })
});
