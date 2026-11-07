import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({ entry: ['src/index.ts', 'src/gateway.index.ts', 'src/http.index.ts'] });
