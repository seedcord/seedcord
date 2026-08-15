import 'reflect-metadata';

import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCore } from '#src/dispatch/dispatchInteraction';
import { buildRouteMaps } from '#src/dispatch/resolve';
import { buildEngine } from '#src/engine';

import { signedRequest, slashPayload } from './harness';
import { createSigner } from '../../helpers/ed25519';
import { emptyManifest, nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { SubscriptionData } from '@seedcord/core';

vi.mock('@discordjs/rest', async (importOriginal) => {
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public setToken(): this {
            return this;
        }
    }
    return { ...(await importOriginal<object>()), REST: FakeRest };
});

async function published(payload: object): Promise<SubscriptionData<'anyInteraction'>[]> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN }));

    const core = createCore(nullPathConfig, VALID_TOKEN);
    const seen: SubscriptionData<'anyInteraction'>[] = [];
    core.bus.on('anyInteraction', (data) => seen.push(data));

    const { handle } = buildEngine(core, buildRouteMaps(emptyManifest()));
    await handle(await signedRequest(signer, payload));
    return seen;
}

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('anyInteraction from the http engine', () => {
    it('publishes every verified interaction with its raw payload', async () => {
        const seen = await published(slashPayload('anything'));

        expect(seen).toHaveLength(1);
        expect(seen[0]?.interaction).toMatchObject({ id: 'int-1', type: 2 });
    });

    it('publishes nothing for a ping', async () => {
        expect(await published({ type: 1, id: 'ping-1', application_id: 'app-1', token: 'tok' })).toHaveLength(0);
    });
});
