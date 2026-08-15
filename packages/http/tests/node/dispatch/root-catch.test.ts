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

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

// the router is the first thing past the ack guard, so a throw there reaches the root catch
async function routerThrows(thrown: unknown): Promise<{
    response: Response;
    seen: SubscriptionData<'unhandledInteractionError'>[];
}> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN }));

    const core = createCore(nullPathConfig, VALID_TOKEN);
    const seen: SubscriptionData<'unhandledInteractionError'>[] = [];
    core.bus.on('unhandledInteractionError', (payload) => seen.push(payload));

    const maps = buildRouteMaps(emptyManifest());
    vi.spyOn(maps.slash, 'get').mockImplementation(() => {
        throw thrown;
    });
    const { handle } = buildEngine(core, maps);

    return { response: await handle(await signedRequest(signer, slashPayload('anything'))), seen };
}

describe('the http root catch', () => {
    it('publishes unhandledInteractionError when routing throws past the boundary', async () => {
        const { response, seen } = await routerThrows(new Error('router exploded'));

        // the ack still goes out, since a dispatch throw never eats it
        expect(response.status).toBe(202);
        expect(seen).toHaveLength(1);
        expect(seen[0]?.error.message).toBe('router exploded');
    });

    it('wraps a non-Error throw, so the payload still carries an Error', async () => {
        const { seen } = await routerThrows('router string');

        expect(seen).toHaveLength(1);
        expect(seen[0]?.error.message).toBe('router string');
    });
});
