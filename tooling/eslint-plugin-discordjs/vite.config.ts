import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    test: {
        // each type-aware test builds a TS program, and prePush runs every suite in parallel
        testTimeout: 60_000
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts'],
        // the shared utils package is private
        deps: { alwaysBundle: ['@seedcord/eslint-utils'] }
    })
});
