import { createTsdownConfig } from '@seedcord/tsdown-config';

// every create call is a cold download
export default createTsdownConfig({
    entry: ['src/index.ts'],
    deps: { alwaysBundle: [/./], onlyBundle: false },
    format: ['esm'],
    dts: false
});
