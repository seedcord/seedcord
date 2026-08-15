import { Fault } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { describe, expect, it, vi } from 'vitest';

import { extractErrorResponse } from '#miscellaneous/extractErrorResponse';

import { cardJson } from '../utils/cardText';
import { TestNotice } from '../utils/TestNotice';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { SubscriptionData } from '@seedcord/core';
import type { Guild, User } from 'discord.js';

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

describe('extractErrorResponse', () => {
    it('publishes handledException for a reporting denial with the uuid the reply shows', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('write failed') });
        const result = extractErrorResponse(denial, mockCore(publish), {
            interaction: slashInteraction(),
            routeId: 'slash:ban',
            guild: null,
            user: null
        });

        expect(publish).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'handledException'>];
        expect(event).toBe('handledException');
        expect(payload.denial).toBe(denial);
        expect(payload.uuid).toBe(result.uuid);
        if (payload.source.kind !== 'interaction') throw new Error('expected interaction source');
        expect(payload.source.command).toBe('ban');

        expect(cardJson(result.response)).toContain(result.uuid);
    });

    it('publishes unknownException for a raw, non-denial throw', () => {
        const publish = vi.fn();
        const result = extractErrorResponse(new Error('a bug'), mockCore(publish), {
            routeId: 'autocomplete:raw-probe',
            guild: null,
            user: null
        });

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: result.uuid }));
    });

    it('publishes the routeId it was given, so a subscriber can group faults by route', () => {
        const publish = vi.fn();
        extractErrorResponse(new Error('a bug'), mockCore(publish), {
            routeId: 'slash:route-probe',
            guild: null,
            user: null
        });

        const [, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(payload.routeId).toBe('slash:route-probe');
    });

    it('publishes both bugs when one route throws two different errors', () => {
        const publish = vi.fn();
        const core = mockCore(publish);
        const origin = {
            interaction: slashInteraction('profile'),
            routeId: 'slash:profile',
            guild: null,
            user: null
        };

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

        extractErrorResponse(new Error('a bug'), mockCore(publish), { routeId: 'slash:scalar-probe', guild, user });

        const [, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(payload.guild).toEqual({ id: 'g1', name: 'Guild One' });
        expect(payload.user).toEqual({ id: 'u1', username: 'uname' });
    });

    it('publishes nothing for a non-reporting denial', () => {
        const publish = vi.fn();
        extractErrorResponse(new TestNotice(), mockCore(publish), {
            interaction: slashInteraction(),
            routeId: 'slash:quiet-probe',
            guild: null,
            user: null
        });

        expect(publish).not.toHaveBeenCalled();
    });

    it('publishes handledException with an event source for a reporting denial on the event path', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('write failed') });
        extractErrorResponse(denial, mockCore(publish), {
            event: { name: 'messageCreate', handler: 'Starboard', args: [{}], channelId: 'ch1' },
            routeId: 'event:messageCreate:Starboard',
            guild: null,
            user: null
        });

        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'handledException'>];
        expect(event).toBe('handledException');
        expect(payload.denial).toBe(denial);
        if (payload.source.kind !== 'event') throw new Error('expected event source');
        expect(payload.source.eventName).toBe('messageCreate');
        expect(payload.source.handler).toBe('Starboard');
        expect(payload.source.channelId).toBe('ch1');
    });
});
