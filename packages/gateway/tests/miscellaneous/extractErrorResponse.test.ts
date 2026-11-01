import { DispatchContext, Fault } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, vi } from 'vitest';

import { extractErrorResponse } from '#miscellaneous/extractErrorResponse';
import { cardJson } from '#tests/utils/cardText';
import { TestNotice } from '#tests/utils/TestNotice';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { SubscriptionData } from '@seedcord/core';
import type { LogRecord } from '@seedcord/types';
import type { AutocompleteInteraction, Guild, User } from 'discord.js';

const dispatch = new DispatchContext('slash', 'ban');

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface extractErrorResponse reads.
    return { bus: { [PublishDefault]: publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

function slashInteraction(actors: { guild?: Guild; user?: User } = {}): Repliables {
    // justified: the fixture implements only the Repliables surface buildInteractionSource reads.
    return {
        isCommand: () => true,
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
        isButton: () => false,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        user: actors.user ?? { id: 'u1' },
        guild: actors.guild ?? null,
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1'
    } as unknown as Repliables;
}

// justified: the autocomplete path reads only guild and user off the interaction
const autocomplete = { guild: null, user: { id: 'u1', username: 'uname' } } as unknown as AutocompleteInteraction;

describe('extractErrorResponse', () => {
    it('publishes handledException for a reporting denial with the uuid the reply shows', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('write failed') });
        const result = extractErrorResponse(denial, mockCore(publish), {
            kind: 'interaction',
            interaction: slashInteraction(),
            dispatch
        });

        expect(publish).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'handledException'>];
        expect(event).toBe('handledException');
        expect(payload.denial).toBe(denial);
        expect(payload.uuid).toBe(result.uuid);
        expect(payload.origin).toBe('slash:ban');
        if (payload.source.kind !== 'interaction') throw new Error('expected interaction source');
        expect(payload.source.command).toBe('ban');

        expect(cardJson(result.response)).toContain(result.uuid);
    });

    it('publishes unknownException for a raw, non-denial throw and logs its stack', () => {
        const publish = vi.fn();
        const logged: LogRecord[] = [];
        using _capture = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => logged.push(r) });
        const thrown = new Error('a bug');
        const result = extractErrorResponse(thrown, mockCore(publish), {
            kind: 'autocomplete',
            interaction: autocomplete,
            dispatch
        });

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: result.uuid }));
        expect(logged.at(-1)?.args).toEqual([thrown]);
    });

    it('publishes unknownException for a reporting denial on an autocomplete, which has no typed source', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('lookup failed') });
        extractErrorResponse(denial, mockCore(publish), { kind: 'autocomplete', interaction: autocomplete, dispatch });

        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(event).toBe('unknownException');
        expect(payload.error).toBe(denial);
        expect(payload.origin).toBe('slash:ban');
    });

    it('publishes both bugs when one route throws two different errors', () => {
        const publish = vi.fn();
        const core = mockCore(publish);
        const origin = { kind: 'interaction', interaction: slashInteraction(), dispatch } as const;

        extractErrorResponse(new Error('avatar fetch failed'), core, origin);
        extractErrorResponse(new Error('rank lookup failed'), core, origin);

        const messages = publish.mock.calls
            .filter(([event]) => event === 'unknownException')
            .map(([, payload]) => (payload as SubscriptionData<'unknownException'>).error.message);
        expect(messages).toEqual(['avatar fetch failed', 'rank lookup failed']);
    });

    it('publishes scalar guild and user fields, never the discord.js objects', () => {
        const publish = vi.fn();
        // justified: the fixtures carry the fields the scalar mapping reads plus djs baggage it must drop
        const guild = { id: 'g1', name: 'Guild One', members: {} } as unknown as Guild;
        const user = { id: 'u1', username: 'uname', client: {} } as unknown as User;

        extractErrorResponse(new Error('a bug'), mockCore(publish), {
            kind: 'interaction',
            interaction: slashInteraction({ guild, user }),
            dispatch
        });

        const [, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(payload.guild).toEqual({ id: 'g1', name: 'Guild One' });
        expect(payload.user).toEqual({ id: 'u1', username: 'uname' });
    });

    it('publishes nothing for a non-reporting denial', () => {
        const publish = vi.fn();
        extractErrorResponse(new TestNotice(), mockCore(publish), {
            kind: 'interaction',
            interaction: slashInteraction(),
            dispatch
        });

        expect(publish).not.toHaveBeenCalled();
    });

    it('publishes handledException with an event source for a reporting denial on the event path', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('write failed') });
        extractErrorResponse(denial, mockCore(publish), {
            kind: 'event',
            dispatch,
            event: {
                name: 'messageCreate',
                handler: 'Starboard',
                args: [{}],
                channelId: 'ch1',
                guild: null,
                user: null
            }
        });

        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'handledException'>];
        expect(event).toBe('handledException');
        expect(payload.denial).toBe(denial);
        expect(payload.origin).toBe('event:messageCreate:Starboard');
        if (payload.source.kind !== 'event') throw new Error('expected event source');
        expect(payload.source.eventName).toBe('messageCreate');
        expect(payload.source.handler).toBe('Starboard');
        expect(payload.source.channelId).toBe('ch1');
    });
});
