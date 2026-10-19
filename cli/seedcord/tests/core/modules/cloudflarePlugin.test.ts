import { describe, expect, it } from 'vite-plus/test';

import { importCloudflare } from '#core/modules/cloudflarePlugin';

describe('importCloudflare', () => {
    it('reuses one copy of the plugin while no worker reported named exports', async () => {
        const first = await importCloudflare();

        await expect(importCloudflare()).resolves.toBe(first);
    });
});
