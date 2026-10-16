import { describe, it } from 'vitest';

import { defineConfig as defineEdgeConfig } from '#src/workerd.index';

describe('defineConfig', () => {
    it('rejects build.outDir on an edge config', () => {
        // @ts-expect-error the cloudflare plugin sets an edge worker's output folder
        defineEdgeConfig({ instance: './bot.ts', build: { outDir: './out' } });
    });
});
