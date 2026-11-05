import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

import { createTestConfig } from './src';

export default defineConfig({
    test: createTestConfig(),
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/freshModules.ts'],
        clean: true
    })
});
