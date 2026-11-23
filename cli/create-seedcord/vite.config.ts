import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    test: {
        testTimeout: 20_000
    },
    // every create call is a cold download
    pack: createTsdownConfig({
        entry: ['src/index.ts'],
        deps: {
            alwaysBundle: [/./],
            // ink checks DEV=true, then imports it only if the real package resolves
            neverBundle: ['react-devtools-core'],
            onlyBundle: false
        },
        env: { NODE_ENV: 'production' }, // react's dev build becomes dead code
        minify: true,
        sourcemap: false,
        dts: false
    })
});
