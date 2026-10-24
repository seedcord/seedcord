import { describe, expect, it, vi } from 'vitest';

import { importCloudflare } from '#core/modules/cloudflarePlugin';

describe('importCloudflare', () => {
    it('reuses one copy of the plugin while no worker reported named exports', async () => {
        const first = await importCloudflare();

        await expect(importCloudflare()).resolves.toBe(first);
    });

    it('loads a fresh plugin after the test module cache resets', async () => {
        const previous = await importCloudflare();

        vi.resetModules();
        const reloaded = await import('#core/modules/cloudflarePlugin');

        expect(await reloaded.importCloudflare()).not.toBe(previous);
    });
});
