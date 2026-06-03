import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts', 'src/cli.ts', 'src/api/vite-hmr.ts'],
    format: ['esm'],
    deps: {
        skipNodeModulesBundle: true,
        neverBundle: ['commander', '@commander-js/extra-typings', 'chalk', 'jiti', 'tsx/esm/api', 'typescript']
    }
});
