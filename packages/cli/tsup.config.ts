import { createTsupConfig } from '@seedcord/tsup-config';

export default createTsupConfig({
    entry: ['src/index.ts', 'src/cli.ts'],
    format: ['esm'],
    external: [
        'commander',
        '@commander-js/extra-typings',
        '@clack/prompts',
        'chalk',
        'jiti',
        'tsx',
        'tsx/esm/api',
        'seedcord'
    ],
    banner: {
        js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
    }
});
