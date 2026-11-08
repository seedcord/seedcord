import { createTsdownConfig } from '@seedcord/tsdown-config';

import { createViteConfig } from './src';

export default createViteConfig(import.meta.url, {
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/freshModules.ts'],
        clean: true
    })
});
