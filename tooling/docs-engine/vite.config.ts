import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: createTsdownConfig({ entry: ['src/index.ts', 'src/client.ts', 'src/workspace.ts'] })
});
