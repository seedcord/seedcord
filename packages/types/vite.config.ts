import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    test: {
        include: ['tests/**/*.types-test.ts']
    },
    pack: createTsdownConfig({
        entry: ['src/index.ts', 'src/internal.index.ts']
    })
});
