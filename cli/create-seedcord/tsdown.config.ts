import { createTsdownConfig } from '@seedcord/tsdown-config';

// every create call is a cold download
export default createTsdownConfig({ entry: ['src/index.ts'], deps: {}, format: ['esm'], dts: false });
