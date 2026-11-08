import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 10_000,
        globalSetup: './tests/utils/globalSetup.ts',
        fileParallelism: false
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/manifest-fields.ts', 'src/RuntimeBuild.ts']
    })
});
