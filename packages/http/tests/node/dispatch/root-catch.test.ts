import 'reflect-metadata';

import { InteractionKind } from '@seedcord/core';
import { emptyRouteMaps, interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { InteractionEngine } from '#src/InteractionEngine';
import { testCore } from '#tests/helpers/core';
import { createSigner } from '#tests/helpers/ed25519';
import { nullPathConfig, VALID_TOKEN } from '#tests/helpers/fixtures';

import { signedRequest, slashPayload } from './harness';

import type { HandlerSlots, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { SubscriptionData } from '@seedcord/core';

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

// a throw in the router reaches the root catch because the router is the first thing past the ack guard
async function routerThrows(thrown: unknown): Promise<{
    response: Response;
    seen: SubscriptionData<'unhandledInteractionError'>[];
}> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));

    const core = testCore(nullPathConfig, VALID_TOKEN);
    const seen: SubscriptionData<'unhandledInteractionError'>[] = [];
    core.bus.on('unhandledInteractionError', (payload) => seen.push(payload));

    const maps = emptyRouteMaps<HandlerSlots>();
    vi.spyOn(maps[InteractionKind.Slash], 'get').mockImplementation(() => {
        throw thrown;
    });
    const engine = new InteractionEngine(
        core,
        maps,
        new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware),
        signer.publicKeyHex
    );

    return { response: await engine.handle(await signedRequest(signer, slashPayload('anything'))), seen };
}

describe('the http root catch', () => {
    it('publishes unhandledInteractionError when routing throws past the boundary', async () => {
        const { response, seen } = await routerThrows(new Error('router exploded'));

        // handle() still returns the ack because a dispatch throw never stops it
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
