import { createTsupConfig } from '@seedcord/tsup-config';

export default createTsupConfig({ entry: ['src/index.ts', 'src/internal.index.ts'] });
