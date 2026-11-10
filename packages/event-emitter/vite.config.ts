import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    pack: createTsdownConfig({
        entry: ['src/index.ts']
    })
});
