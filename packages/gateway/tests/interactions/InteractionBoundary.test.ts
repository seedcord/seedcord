import { Silence, Fault } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { MessageFlags, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleInteractionFault as boundary } from '@bot/handleInteractionFault';
import { ReplySender } from '@bot/ReplySender';

import { harmlessError } from '../utils/harmlessError';
import { TestNotice } from '../utils/TestNotice';

import type { Core } from '@interfaces/Core';
import type { SubscriptionData } from '@seedcord/core';
import type { Repliables, ValidInteractionTypes } from '@src/handlers/interactionTypes';

const withResponse = { resource: { message: { id: 'sent' } } };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function mockInteraction() {
    return {
        reply: vi.fn().mockResolvedValue(withResponse),
        deferReply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue({ id: 'sent' }),
        followUp: vi.fn().mockResolvedValue({ id: 'sent' }),
        deleteReply: vi.fn().mockResolvedValue(undefined),
        respond: vi.fn().mockResolvedValue(undefined),
        isAutocomplete: vi.fn().mockReturnValue(false),
        isMessageComponent: vi.fn().mockReturnValue(false),
        isModalSubmit: vi.fn().mockReturnValue(false),
        isFromMessage: vi.fn().mockReturnValue(false),
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
        replied: false,
        ephemeral: null as boolean | null
    };
}

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface the boundary reads.
    return { bus: { [PublishDefault]: publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

// justified: the fixture implements only the interaction surface the boundary reads.
function asInteraction(mock: ReturnType<typeof mockInteraction>): ValidInteractionTypes {
    return mock as unknown as ValidInteractionTypes;
}

// the dispatcher supplies its own route id, these cases pin the boundary's other behavior
function handleInteractionFault(
    caught: unknown,
    interaction: ValidInteractionTypes,
    core: Core,
    sender?: ReplySender
): Promise<void> {
    return boundary(caught, interaction, core, 'slash:test', sender);
}

function senderFor(mock: ReturnType<typeof mockInteraction>, routeId: string): ReplySender {
    // justified: the fixture implements only the Repliables surface the sender reads.
    return new ReplySender(mock as unknown as Repliables, routeId);
}

describe('handleInteractionFault', () => {
    let mock: ReturnType<typeof mockInteraction>;
    let publish: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mock = mockInteraction();
        publish = vi.fn();
    });

    it('replies the generic and publishes unknownException for a raw error on an unacked interaction', async () => {
        await handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish));

        expect(mock.reply).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(event).toBe('unknownException');
        expect(payload.error).toBeInstanceOf(Error);
    });

    it('attaches the interaction as metadata on a raw fault, so the report keeps its metadata.json', async () => {
        const interaction = asInteraction(mock);

        await handleInteractionFault(new Error('boom'), interaction, mockCore(publish));

        const [, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(payload.metadata).toBe(interaction);
    });

    it('makes no reply and no report for a Silence', async () => {
        await handleInteractionFault(new Silence('blacklisted'), asInteraction(mock), mockCore(publish));

        expect(mock.reply).not.toHaveBeenCalled();
        expect(mock.editReply).not.toHaveBeenCalled();
        expect(mock.followUp).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it('wraps a non-Error value, so a handler that threw a string still shows the fault card', async () => {
        await expect(
            handleInteractionFault('a thrown string', asInteraction(mock), mockCore(publish))
        ).resolves.toBeUndefined();

        expect(mock.reply).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(event).toBe('unknownException');
        expect(payload.error.message).toBe('a thrown string');
    });

    // the uuid on the user's error card has to be greppable, so the log runs before the throttle
    it('logs every occurrence of a throttled fault, publishing only the first', async () => {
        const core = mockCore(publish);
        const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        await handleInteractionFault(new Error('db down'), asInteraction(mock), core);
        await handleInteractionFault(new Error('db down'), asInteraction(mockInteraction()), core);

        const lines = errorLog.mock.calls.map(([message]) => String(message));
        expect(lines.filter((line: string) => line.includes('db down'))).toHaveLength(2);
        expect(publish.mock.calls.filter(([event]) => event === 'unknownException')).toHaveLength(1);
        errorLog.mockRestore();
    });

    it('reports an api code by default, since ignoreApiCodes is empty', async () => {
        await handleInteractionFault(harmlessError(), asInteraction(mock), mockCore(publish));

        expect(publish).toHaveBeenCalledWith('unknownException', expect.anything());
    });

    it('swallows an api code listed in ignoreApiCodes, with no reply or report', async () => {
        // justified: the fixture implements only the Core surface the boundary reads.
        const core = {
            bus: { [PublishDefault]: publish },
            config: { errors: { ignoreApiCodes: [RESTJSONErrorCodes.UnknownInteraction] }, notifications: {} }
        } as unknown as Core;

        await handleInteractionFault(harmlessError(), asInteraction(mock), core);

        expect(mock.reply).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it('edits the deferReply placeholder and publishes handledException for a reporting fault on a deferred interaction', async () => {
        mock.deferred = true;
        mock.ephemeral = false;

        await handleInteractionFault(
            new Fault({ cause: new Error('write failed') }),
            asInteraction(mock),
            mockCore(publish)
        );

        expect(mock.editReply).toHaveBeenCalledTimes(1);
        expect(mock.followUp).not.toHaveBeenCalled();
        expect(mock.deleteReply).not.toHaveBeenCalled();
        expect(mock.reply).not.toHaveBeenCalled();
        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'handledException'>];
        expect(event).toBe('handledException');
        expect(payload.denial).toBeInstanceOf(Fault);
    });

    it('follows up and reports no fault for a non-reporting denial on a replied interaction', async () => {
        mock.replied = true;

        await handleInteractionFault(new TestNotice(), asInteraction(mock), mockCore(publish));

        expect(mock.followUp).toHaveBeenCalledTimes(1);
        // the boundary's own followUp publishes responseAttempted, so assert on the fault keys alone
        const keys = publish.mock.calls.map(([event]) => event as string);
        expect(keys).not.toContain('handledException');
        expect(keys).not.toContain('unknownException');
    });

    it('replies ephemerally for a refusal by default', async () => {
        await handleInteractionFault(new TestNotice(), asInteraction(mock), mockCore(publish));

        const options = mock.reply.mock.calls[0]?.[0] as { flags: number };
        expect(options.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
    });

    it('replies publicly when the refusal Notice sets ephemeral false', async () => {
        const notice = new TestNotice();
        notice.ephemeral = false;

        await handleInteractionFault(notice, asInteraction(mock), mockCore(publish));

        const options = mock.reply.mock.calls[0]?.[0] as { flags: number };
        expect(options.flags & MessageFlags.Ephemeral).toBe(0);
    });

    it('swallows a harmless api code thrown by its own fault-card send', async () => {
        mock.reply.mockRejectedValueOnce(harmlessError());

        await expect(
            handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish))
        ).resolves.toBeUndefined();
        expect(mock.reply).toHaveBeenCalledTimes(1);
    });

    it('swallows an unexpected failure from its own fault-card send', async () => {
        mock.reply.mockRejectedValueOnce(new Error('network down'));

        await expect(
            handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish))
        ).resolves.toBeUndefined();
        expect(mock.reply).toHaveBeenCalledTimes(1);
    });

    describe('autocomplete arm', () => {
        beforeEach(() => {
            mock.isAutocomplete.mockReturnValue(true);
        });

        // the only legal autocomplete response, and it clears the client's loading spinner
        it('responds with empty choices, so the dropdown stops spinning', async () => {
            await handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish));

            expect(mock.respond).toHaveBeenCalledWith([]);
        });

        it('builds no sender and publishes unknownException with metadata for a raw error', async () => {
            const interaction = asInteraction(mock);

            await handleInteractionFault(new Error('boom'), interaction, mockCore(publish));

            expect(mock.reply).not.toHaveBeenCalled();
            expect(mock.editReply).not.toHaveBeenCalled();
            expect(mock.followUp).not.toHaveBeenCalled();
            const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
            expect(event).toBe('unknownException');
            expect(payload.metadata).toBe(interaction);
        });

        it('reports a reporting denial through unknownException, keeping its metadata', async () => {
            const interaction = asInteraction(mock);

            await handleInteractionFault(new Fault({ cause: new Error('x') }), interaction, mockCore(publish));

            expect(mock.reply).not.toHaveBeenCalled();
            const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
            expect(event).toBe('unknownException');
            expect(payload.error).toBeInstanceOf(Fault);
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

            await handleInteractionFault(new Fault({ cause: new Error('x') }), asInteraction(search), core);
            await handleInteractionFault(new Fault({ cause: new Error('x') }), asInteraction(lookup), core);

            // the empty-choices send publishes responseAttempted too, so count the fault key alone
            expect(publish.mock.calls.filter(([event]) => event === 'unknownException')).toHaveLength(2);
        });

        it('publishes responseAttempted for the empty-choices send', async () => {
            await handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish));

            const writes = publish.mock.calls.filter(([key]) => key === 'responseAttempted');
            expect(writes).toHaveLength(1);
            expect(writes[0]?.[1] as SubscriptionData<'responseAttempted'>).toMatchObject({
                method: 'respond',
                outcome: 'sent',
                messageId: null
            });
        });
    });

    describe('live sender', () => {
        it('sends the fault card through the passed sender, following up after the handler already acked', async () => {
            // pre-reply puts the live sender in the replied state, so the fault card follows up
            const sender = senderFor(mock, 'slash:boom');
            await sender.reply('done');
            mock.reply.mockClear();

            await handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish), sender);

            expect(mock.followUp).toHaveBeenCalledTimes(1);
            expect(mock.reply).not.toHaveBeenCalled();
        });

        it('builds its own sender from the interaction when none is passed, replying on the unacked interaction', async () => {
            // a middleware or pre-construction throw carries no handler, so the boundary builds its own sender from the interaction
            await handleInteractionFault(new Error('boom'), asInteraction(mock), mockCore(publish));

            expect(mock.reply).toHaveBeenCalledTimes(1);
            expect(mock.followUp).not.toHaveBeenCalled();
        });
    });
});
