import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({ entry: ['src/index.ts', 'src/client.ts', 'src/workspace.ts'] });
