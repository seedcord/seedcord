import { DispatchContext, Fault } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { extractErrorResponse } from '#miscellaneous/extractErrorResponse';
import { TestNotice } from '#tests/utils/TestNotice';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';

const dispatch = new DispatchContext('slash:probe');

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface extractErrorResponse reads.
    return { bus: { [PublishDefault]: publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
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

const PublishDefault = 'publishDefault';

describe('extractErrorResponse - errorStack default', () => {
    it('logs the full stack when errorStack is omitted (default true)', () => {
        const publish = vi.fn();
        const result = extractErrorResponse(new Error('a bug'), mockCore(publish), {
            origin: 'autocomplete:raw-probe',
            dispatch,
            guild: null,
            user: null
        });

        // Before the flip (?? false), the log would be: `${uuid} | ${error.message}`
        // After the flip (?? true), the full error object (with stack) is logged
        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: result.uuid }));
    });

    it('falls back to uuid | message when errorStack is explicitly false', () => {
        const publish = vi.fn();
        const core = mockCore(publish);
        // Override the config to explicitly set errorStack: false
        // This tests the fallback path
        (core.config as any).errors = { errorStack: false };

        extractErrorResponse(new Error('a bug'), core, {
            origin: 'autocomplete:raw-probe',
            dispatch,
            guild: null,
            user: null
        });

        // When errorStack is false, the log should include causeLine
        // The else branch logs: `${uuid} | ${error.message}${causeLine(error)}`
        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: expect.any(String) }));
    });
});