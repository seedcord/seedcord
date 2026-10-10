import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts', 'src/workerd.index.ts', 'src/cli.ts'],
    format: ['esm']
});
