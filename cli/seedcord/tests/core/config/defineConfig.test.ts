import { describe, expectTypeOf, it } from 'vitest';

import { defineConfig } from '#src/index';
import { defineConfig as defineEdgeConfig } from '#src/workerd.index';

describe('defineConfig', () => {
    it('takes build.outDir on a server config', () => {
        expectTypeOf(defineConfig).toBeCallableWith({
            instance: './bot.ts',
            entry: './index.ts',
            build: { outDir: './out' }
        });
    });

    it('rejects build.outDir on an edge config', () => {
        // @ts-expect-error the cloudflare plugin sets an edge worker's output folder
        defineEdgeConfig({ instance: './bot.ts', build: { outDir: './out' } });
    });
});
