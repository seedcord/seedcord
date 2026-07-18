import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts', 'src/internal.index.ts', 'src/hmr.index.ts', 'src/node.index.ts']
});
