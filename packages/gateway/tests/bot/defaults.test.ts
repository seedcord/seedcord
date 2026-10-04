import { TextDisplayBuilder } from '@discordjs/builders';
import { DispatchContext } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { MessageFlags } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { UnhandledAutocomplete } from '#bot/defaults/UnhandledAutocomplete';
import { UnhandledRepliable } from '#bot/defaults/UnhandledRepliable';
import { mockInteraction } from '#tests/utils/senderMock';

import type { Core } from '#interfaces/Core';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';

const dispatch = new DispatchContext('test:probe');

// justified: the defaults read only the interaction, the rest of Core is unused here.
// justified: a real Core always carries a bus, the handlers publish through it
const core = { bus: { [PublishDefault]: () => undefined } } as unknown as Core;

type Slash = ChatInputCommandInteraction<'cached'>;

function asSlash(mock: ReturnType<typeof mockInteraction>): Slash {
    // justified: the fixture implements only the interaction surface the sender reads, cached-cache matches the base generic
    return mock as unknown as Slash;
}

const notImplemented = new TextDisplayBuilder().setContent('Feature not implemented yet.').toJSON();

describe('UnhandledRepliable', () => {
    it('replies the not-implemented text through the sender, v2 and ephemeral', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: false });
        await new UnhandledRepliable(asSlash(mock), core, dispatch).execute();

        const options = mock.reply.mock.calls[0]?.[0] as { components?: unknown[]; flags?: number };
        expect(mock.reply).toHaveBeenCalledOnce();
        expect(options.components).toEqual([notImplemented]);
        expect((options.flags ?? 0) & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
        expect((options.flags ?? 0) & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
    });
});

describe('UnhandledAutocomplete', () => {
    it('responds with an empty choice set', async () => {
        const respond = vi.fn().mockResolvedValue(undefined);
        // justified: the fixture implements only respond, the surface UnhandledAutocomplete reads
        const event = { respond } as unknown as AutocompleteInteraction;

        await new UnhandledAutocomplete(event, core, dispatch).execute();

        expect(respond).toHaveBeenCalledWith([]);
    });
});
