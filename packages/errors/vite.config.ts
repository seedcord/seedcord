import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/internal.index.ts', 'src/ErrorCodes.ts'],
        deps: { neverBundle: true, alwaysBundle: ['@seedcord/brand'] }
    })
});
