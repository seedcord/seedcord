import { createTsdownConfig } from '@seedcord/tsdown-config';

// every create call is a cold download
export default createTsdownConfig({
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
    format: ['esm'],
    dts: false
});
