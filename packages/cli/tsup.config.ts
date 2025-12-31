import { createTsupConfig } from '@seedcord/tsup-config';

export default createTsupConfig({
    entry: ['src/index.ts', 'src/cli.ts', 'src/api/vite-hmr.ts'],
    format: ['esm'],
    external: ['commander', '@commander-js/extra-typings', 'chalk', 'jiti', 'tsx/esm/api', 'typescript'],
    banner: {
        js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
    }
});
