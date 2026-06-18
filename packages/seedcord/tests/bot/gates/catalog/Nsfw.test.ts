import { describe, it, expect } from 'vitest';

import { Nsfw, NotNsfw } from '@bot/gates/catalog';

import type { InteractionGateContext, NonModalInteraction } from '@bot/gates';

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
});
