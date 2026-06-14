import { describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@bErrors/Database';
import { UserNotFound } from '@bErrors/User';
import { extractErrorResponse } from '@miscellaneous/extractErrorResponse';

import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { AllSubscriptions } from '@subscribers/types/Subscriptions';

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface extractErrorResponse reads.
    return { bus: { publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

function slashInteraction(): Repliables {
    // justified: the fixture implements only the Repliables surface buildInteractionSource reads.
    return {
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
        isButton: () => false,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        commandName: 'ban',
        options: { getSubcommand: () => null, getSubcommandGroup: () => null },
        user: { id: 'u1' },
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1'
    } as unknown as Repliables;
}

describe('extractErrorResponse', () => {
    it('publishes handledException for a reporting denial with the uuid the reply shows', () => {
        const publish = vi.fn();
        const denial = new DatabaseError('write failed');
        const result = extractErrorResponse(denial, mockCore(publish), {
            interaction: slashInteraction(),
            guild: null,
            user: null
        });

        expect(publish).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['handledException']];
        expect(event).toBe('handledException');
        expect(payload.denial).toBe(denial);
        expect(payload.uuid).toBe(result.uuid);
        expect(payload.source.kind).toBe('interaction');
        expect(payload.source.command).toBe('ban');

        if (result.response.kind !== 'embed') throw new Error('expected embed arm');
        expect(result.response.embeds[0]?.data.description).toContain(result.uuid);
    });

    it('publishes unknownException for a raw, non-denial throw', () => {
        const publish = vi.fn();
        const result = extractErrorResponse(new Error('a bug'), mockCore(publish), { guild: null, user: null });

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: result.uuid }));
    });

    it('publishes nothing for a non-reporting denial', () => {
        const publish = vi.fn();
        extractErrorResponse(new UserNotFound('999'), mockCore(publish), {
            interaction: slashInteraction(),
            guild: null,
            user: null
        });

        expect(publish).not.toHaveBeenCalled();
    });
});
