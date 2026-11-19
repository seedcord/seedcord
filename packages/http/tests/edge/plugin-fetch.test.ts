import { DEV_URL_HEADER, WORKER_PROBE } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Seedcord } from '#src/edge/Seedcord';
import { clearBakedIds, registerBakedIds } from '#tests/helpers/bakedIds';
import { createSigner } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';
import { capturingCtx } from '#tests/helpers/interactions';

import type { HttpEdgeConfig } from '#interfaces/Config';

const CONFIG: HttpEdgeConfig = {
    bot: { interactions: { path: null }, commands: { path: null } },
    subscribers: { path: null }
};

const calls: string[] = [];

class Page extends Plugin {
    public init(): Promise<void> {
        calls.push('init');
        return Promise.resolve();
    }

    public override fetch(request: Request): Response | undefined {
        return new URL(request.url).pathname === '/page' ? new Response('page') : undefined;
    }
}

describe('a plugin fetch method on edge', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
        clearBakedIds();
        calls.length = 0;
    });

    it('starts the bot for a GET, answers it from the plugin, and ignores the dev header in production', async () => {
        const signer = await createSigner();
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));
        registerBakedIds({ publicKey: signer.publicKeyHex });
        const seedcord = new Seedcord(CONFIG).attach('page', Page);
        const rewrite = new Request('https://bot.test/', { headers: { [DEV_URL_HEADER]: '/page' } });

        const answered = await seedcord.fetch(new Request('https://bot.test/page'), undefined, capturingCtx());
        const passed = await seedcord.fetch(new Request('https://bot.test/other'), undefined, capturingCtx());
        const rewritten = await seedcord.fetch(rewrite, undefined, capturingCtx());

        expect(await answered.text()).toBe('page');
        expect([passed.status, rewritten.status]).toEqual([404, 404]);
        expect(calls).toEqual(['init']);
    });

    it("answers seedcord's probe before it starts", async () => {
        Envapter.useSource(new PortableSource({}));
        const seedcord = new Seedcord(CONFIG).attach('page', Page);
        const probe = new Request('https://bot.test/', { headers: { [WORKER_PROBE.header]: '1' } });

        const response = await seedcord.fetch(probe, undefined, capturingCtx());

        expect(response.status).toBe(WORKER_PROBE.status);
        expect(calls).toEqual([]);
    });
});
