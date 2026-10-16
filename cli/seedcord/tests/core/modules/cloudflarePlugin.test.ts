import { describe, expect, it } from 'vitest';

import { importCloudflare, reportWorkerExports } from '#core/modules/cloudflarePlugin';

describe('importCloudflare', () => {
    it('reuses one copy of the plugin while no worker reported named exports', async () => {
        const first = await importCloudflare();

        await expect(importCloudflare()).resolves.toBe(first);
    });

    it('loads a fresh copy after a worker reported named exports', async () => {
        const before = await importCloudflare();
        reportWorkerExports(['helper']);

        const after = await importCloudflare();

        expect(after).not.toBe(before);
        await expect(importCloudflare()).resolves.toBe(after);
    });
});
