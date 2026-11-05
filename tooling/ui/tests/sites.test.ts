import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

describe('the three sites', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('sit on the production origin by default', async () => {
        const { HOME_URL, GUIDE_URL } = await import('#src/sites.ts');

        expect([HOME_URL, GUIDE_URL]).toEqual(['https://seedcord.org', 'https://seedcord.org/guide']);
    });

    it('move home and the guide to NEXT_PUBLIC_SITE_ORIGIN, and the chat link stays on production', async () => {
        vi.stubEnv('NEXT_PUBLIC_SITE_ORIGIN', 'https://next.seedcord.org');

        const { HOME_URL, GUIDE_URL, DISCORD_URL, IS_PRODUCTION } = await import('#src/sites.ts');

        expect(IS_PRODUCTION).toBe(false);
        expect([HOME_URL, GUIDE_URL, DISCORD_URL]).toEqual([
            'https://next.seedcord.org',
            'https://next.seedcord.org/guide',
            'https://seedcord.org/chat/'
        ]);
    });
});
