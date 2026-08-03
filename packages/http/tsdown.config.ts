import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({ entry: ['src/index.ts', 'src/edge.index.ts', 'src/manifest.index.ts'] });
