import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({ entry: ['src/index.ts', 'src/manifest-fields.ts', 'src/RuntimeBuild.ts'] });
