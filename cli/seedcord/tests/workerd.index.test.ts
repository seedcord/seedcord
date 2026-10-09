import { describe, expectTypeOf, it } from 'vitest';

import { defineConfig } from '#core/config/schema';
import * as workerd from '#src/workerd.index';

describe('defineConfig under each export condition', () => {
    it('requires entry on a server bot', () => {
        // @ts-expect-error a server bot starts from entry
        defineConfig({ instance: './bot.ts' });
    });

    it('rejects entry on an edge bot', () => {
        expectTypeOf(workerd.defineConfig).toBeCallableWith({ instance: './bot.ts' });
        // @ts-expect-error cloudflare calls the default export of instance
        workerd.defineConfig({ instance: './bot.ts', entry: './index.ts' });
    });
});
