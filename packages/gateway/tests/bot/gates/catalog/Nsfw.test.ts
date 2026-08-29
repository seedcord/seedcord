import { or, OwnerOnly } from '@seedcord/core';
import { NeedsAny } from '@seedcord/core/internal';
import { describe, it, expect } from 'vitest';

import { Nsfw } from '#bot/gates/catalog';
import { NotNsfw } from '#bot/notices';

import type { InteractionGateContext } from '#bot/gates';
import type { NonModalInteraction } from '#src/handlers/interactionTypes';

function nsfwCtx(channel: unknown): InteractionGateContext<NonModalInteraction> {
    // the gate reads only interaction.channel, so a minimal cast stands in
    return { interaction: { channel } } as unknown as InteractionGateContext<NonModalInteraction>;
}

describe('Nsfw', () => {
    it('passes in an age-restricted text channel', async () => {
        await expect(Nsfw().check(nsfwCtx({ isThread: () => false, nsfw: true }))).resolves.toBeUndefined();
    });

    it('refuses in a non-restricted channel with NotNsfw', async () => {
        await expect(Nsfw().check(nsfwCtx({ isThread: () => false, nsfw: false }))).rejects.toBeInstanceOf(NotNsfw);
    });

    it('inherits the age-restriction from a thread parent', async () => {
        await expect(Nsfw().check(nsfwCtx({ isThread: () => true, parent: { nsfw: true } }))).resolves.toBeUndefined();
    });

    it('refuses with no channel', async () => {
        await expect(Nsfw().check(nsfwCtx(null))).rejects.toBeInstanceOf(NotNsfw);
    });

    it('joins the or list beside a core gate', async () => {
        // both gates together read only these three
        const ctx = {
            interaction: { channel: { isThread: () => false, nsfw: false } },
            core: { config: { ownerIds: [] } },
            userId: 'u1'
        } as unknown as InteractionGateContext<NonModalInteraction>;

        const thrown = await or(Nsfw(), OwnerOnly())
            .check(ctx)
            .then(
                () => undefined,
                (error: unknown) => error
            );

        expect(thrown).toBeInstanceOf(NeedsAny);
    });
});
