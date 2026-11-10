import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    test: {
        environment: 'node',
        testTimeout: 10_000
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/gateway.index.ts', 'src/http.index.ts']
    })
});
