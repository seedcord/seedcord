import { Halt } from '@seedcord/kit';
import { DatabaseError } from '@seedcord/kit/internal';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleInteractionFault } from '@bot/handleInteractionFault';
import { faultThrottle } from '@miscellaneous/extractErrorResponse';

import { TestDenial } from '../utils/TestDenial';

import type { ValidInteractionTypes } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { AllSubscriptions } from '@subscribers/types/Subscriptions';

function harmlessError(): DiscordAPIError {
    return new DiscordAPIError(
        { code: RESTJSONErrorCodes.UnknownInteraction, message: 'Unknown interaction' },
        RESTJSONErrorCodes.UnknownInteraction,
        404,
        'POST',
        'https://discord.com/api/interactions/x/y/callback',
        { body: undefined, files: [] }
    );
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function mockInteraction() {
    return {
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue(undefined),
        deleteReply: vi.fn().mockResolvedValue(undefined),
        isAutocomplete: vi.fn().mockReturnValue(false),
        isMessageComponent: vi.fn().mockReturnValue(false),
        isModalSubmit: vi.fn().mockReturnValue(false),
        isChatInputCommand: vi.fn().mockReturnValue(true),
        isContextMenuCommand: vi.fn().mockReturnValue(false),
        isButton: vi.fn().mockReturnValue(false),
        isAnySelectMenu: vi.fn().mockReturnValue(false),
        commandName: 'test',
        options: { getSubcommand: () => null, getSubcommandGroup: () => null },
        user: { id: 'u1' },
        guild: null,
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1',
        deferred: false,
        replied: false
    };
}

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface the boundary reads.
    return { bus: { publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

// justified: the fixture implements only the interaction surface the boundary reads.
function asInteraction(mock: ReturnType<typeof mockInteraction>): ValidInteractionTypes {
    return mock as unknown as ValidInteractionTypes;
}

describe('handleInteractionFault', () => {
    let mock: ReturnType<typeof mockInteraction>;
    let publish: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mock = mockInteraction();
        publish = vi.fn();
        faultThrottle.clear();
    });

    it('replies the generic and publishes unknownException for a raw error on a virgin interaction', async () => {
        await handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish));

        expect(mock.reply).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['unknownException']];
        expect(event).toBe('unknownException');
        expect(payload.error).toBeInstanceOf(Error);
    });

    it('attaches the interaction as metadata on a raw fault, so the report keeps its metadata.json', async () => {
        const interaction = asInteraction(mock);

        await handleInteractionFault(new Error('boom'), interaction, mockCore(publish));

        const [, payload] = publish.mock.calls[0] as [string, AllSubscriptions['unknownException']];
        expect(payload.metadata).toBe(interaction);
    });

    it('makes no reply and no report for a Halt', async () => {
        await handleInteractionFault(new Halt('blacklisted'), asInteraction(mock), mockCore(publish));

        expect(mock.reply).not.toHaveBeenCalled();
        expect(mock.editReply).not.toHaveBeenCalled();
        expect(mock.followUp).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it('rethrows a non-Error value to the root catch', async () => {
        await expect(handleInteractionFault('a thrown string', asInteraction(mock), mockCore(publish))).rejects.toBe(
            'a thrown string'
        );

        expect(mock.reply).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it('reports an api code by default, since ignoreApiCodes is empty', async () => {
        await handleInteractionFault(harmlessError(), asInteraction(mock), mockCore(publish));

        expect(publish).toHaveBeenCalledWith('unknownException', expect.anything());
    });

    it('swallows an api code listed in ignoreApiCodes, with no reply or report', async () => {
        // justified: the fixture implements only the Core surface the boundary reads.
        const core = {
            bus: { publish },
            config: { errors: { ignoreApiCodes: [RESTJSONErrorCodes.UnknownInteraction] }, notifications: {} }
        } as unknown as Core;

        await handleInteractionFault(harmlessError(), asInteraction(mock), core);

        expect(mock.reply).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it('edits the reply and publishes handledException for a reporting denial on a deferred interaction', async () => {
        mock.deferred = true;

        await handleInteractionFault(new DatabaseError('write failed'), asInteraction(mock), mockCore(publish));

        expect(mock.editReply).toHaveBeenCalledTimes(1);
        expect(mock.reply).not.toHaveBeenCalled();
        const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['handledException']];
        expect(event).toBe('handledException');
        expect(payload.denial).toBeInstanceOf(DatabaseError);
    });

    it('follows up and publishes nothing for a non-reporting denial on a replied interaction', async () => {
        mock.replied = true;

        await handleInteractionFault(new TestDenial(), asInteraction(mock), mockCore(publish));

        expect(mock.followUp).toHaveBeenCalledTimes(1);
        expect(publish).not.toHaveBeenCalled();
    });

    describe('autocomplete arm', () => {
        beforeEach(() => {
            mock.isAutocomplete.mockReturnValue(true);
        });

        it('builds no sender and publishes unknownException with metadata for a raw error', async () => {
            const interaction = asInteraction(mock);

            await handleInteractionFault(new Error('boom'), interaction, mockCore(publish));

            expect(mock.reply).not.toHaveBeenCalled();
            expect(mock.editReply).not.toHaveBeenCalled();
            expect(mock.followUp).not.toHaveBeenCalled();
            const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['unknownException']];
            expect(event).toBe('unknownException');
            expect(payload.metadata).toBe(interaction);
        });

        it('reports a reporting denial through unknownException, keeping its metadata', async () => {
            const interaction = asInteraction(mock);

            await handleInteractionFault(new DatabaseError('x'), interaction, mockCore(publish));

            expect(mock.reply).not.toHaveBeenCalled();
            const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['unknownException']];
            expect(event).toBe('unknownException');
            expect(payload.error).toBeInstanceOf(DatabaseError);
            expect(payload.metadata).toBe(interaction);
        });

        it('keys autocomplete faults per route, so two routes with the same error both report', async () => {
            const core = mockCore(publish);
            const search = mockInteraction();
            search.isAutocomplete.mockReturnValue(true);
            search.commandName = 'search';
            const lookup = mockInteraction();
            lookup.isAutocomplete.mockReturnValue(true);
            lookup.commandName = 'lookup';

            await handleInteractionFault(new DatabaseError('x'), asInteraction(search), core);
            await handleInteractionFault(new DatabaseError('x'), asInteraction(lookup), core);

            expect(publish).toHaveBeenCalledTimes(2);
        });
    });
});
