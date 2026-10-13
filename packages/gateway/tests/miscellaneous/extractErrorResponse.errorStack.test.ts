import { describe, expect, it } from 'vitest';

import { extractErrorResponse } from '#miscellaneous/extractErrorResponse';
import { DispatchContext } from '#src/handlers/constructors';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';

const dispatch = new DispatchContext('slash:probe');

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface extractErrorResponse reads.
    return { bus: { publishDefault: publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

function slashInteraction(commandName = 'ban'): Repliables {
    // justified: the fixture implements only the Repliables surface buildInteractionSource reads.
    return {
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
        isButton: () => false,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        commandName,
        options: { getSubcommand: () => null, getSubcommandGroup: () => null },
        user: { id: 'u1' },
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1'
    } as unknown as Repliables;
}

describe('extractErrorResponse - errorStack default', () => {
    it('verifies the default is true when errorStack is omitted', () => {
        const publish = vi.fn();
        const result = extractErrorResponse(new Error('a bug'), mockCore(publish), {
            origin: 'autocomplete:raw-probe',
            dispatch,
            guild: null,
            user: null
        });

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: result.uuid }));
    });

    it('verifies explicit false falls through to uuid | message', () => {
        const publish = vi.fn();
        const core = mockCore(publish);
        (core.config as unknown).errors = { errorStack: false };

        extractErrorResponse(new Error('a bug'), core, {
            origin: 'autocomplete:raw-probe',
            dispatch,
            guild: null,
            user: null
        });

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: expect.any(String) }));
    });
});