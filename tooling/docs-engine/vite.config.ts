import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 15_000,
        globalSetup: './tests/utils/globalSetup.ts'
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/client.ts', 'src/workspace.ts']
    })
});
