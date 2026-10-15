import 'reflect-metadata';

import { interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vitest';

import { emptyRouteMaps } from '#src/dispatch/resolve';
import { buildEngine } from '#src/engine';
import { testCore } from '#tests/helpers/core';
import { createSigner } from '#tests/helpers/ed25519';
import { nullPathConfig, VALID_TOKEN } from '#tests/helpers/fixtures';

import { signedRequest, slashPayload } from './harness';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { SubscriptionData } from '@seedcord/core';

async function published(payload: object): Promise<SubscriptionData<'anyInteraction'>[]> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));

    const core = testCore(nullPathConfig, VALID_TOKEN);
    const seen: SubscriptionData<'anyInteraction'>[] = [];
    core.bus.on('anyInteraction', (data) => seen.push(data));

    const handle = buildEngine(
        core,
        emptyRouteMaps(),
        new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware),
        signer.publicKeyHex
    );
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
