import { describe, expect, it, vi } from 'vitest';

import { InteractionKind } from '#src/metadataKeys';

// resetModules gives the second import its own symbols, like the cli's bundled copy of core
async function loadTwoCopies(): Promise<[typeof import('#src/internal.index'), typeof import('#src/internal.index')]> {
    const writer = await import('#src/internal.index');
    vi.resetModules();
    const reader = await import('#src/internal.index');
    return [writer, reader];
}

describe('interaction route metadata across two copies of core', () => {
    it('reads back a route the other copy stored', async () => {
        const [writer, reader] = await loadTwoCopies();
        class Ban {
            public execute(): void {}
        }

        writer.storeInteractionRoute(InteractionKind.Slash, 'ban', Ban);

        expect(reader.interactionRoutesOf(Ban)).toStrictEqual([[InteractionKind.Slash, ['ban']]]);
    });
});
