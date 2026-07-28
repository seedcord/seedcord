import 'reflect-metadata';

import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCore } from '@src/dispatch/dispatchInteraction';
import { buildRouteMaps } from '@src/dispatch/resolve';
import { buildEngine } from '@src/engine';

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

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('the http root catch', () => {
    it('publishes unhandledInteractionError when routing throws past the boundary', async () => {
        const signer = await createSigner();
        Envapter.useSource(
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        );

        const core = createCore(nullPathConfig, VALID_TOKEN);
        const seen: SubscriptionData<'unhandledInteractionError'>[] = [];
        core.bus.on('unhandledInteractionError', (payload) => seen.push(payload));

        const maps = buildRouteMaps(emptyManifest());
        // the router is the first thing past the ack guard, so a throw there reaches the root catch
        vi.spyOn(maps.slash, 'get').mockImplementation(() => {
            throw new Error('router exploded');
        });
        const { handle } = buildEngine(core, maps);

        const response = await handle(await signedRequest(signer, slashPayload('anything')));

        // the ack still goes out, since a dispatch throw never eats it
        expect(response.status).toBe(202);
        expect(seen).toHaveLength(1);
        expect(seen[0]?.error.message).toBe('router exploded');
    });
});
