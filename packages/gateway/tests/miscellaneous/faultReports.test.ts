import { DispatchContext } from '@seedcord/core/internal';
import { describe, expect, it } from 'vitest';

import { eventFaultReport, interactionFaultReport } from '#miscellaneous/faultReports';

import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { Guild, User } from 'discord.js';

const uuid = '11111111-2222-3333-4444-555555555555';

// justified: the fixtures carry the fields the mapping reads plus djs baggage it must strip
const guild = { id: 'g1', name: 'Guild One', members: {} } as unknown as Guild;
const user = { id: 'u1', username: 'uname', client: {} } as unknown as User;

// justified: the fixture implements only the interaction fields interactionFaultReport reads
const interaction = { user, guild, guildId: 'g1', channelId: 'c1', id: 'i1' } as unknown as ValidInteractionTypes;

describe('fault reports', () => {
    it('reports an interaction under its route, with scalar actors and the command from the dispatch', () => {
        const report = interactionFaultReport(interaction, new DispatchContext('slash', 'ban'), uuid);

        expect(report).toMatchObject({
            uuid,
            origin: 'slash:ban',
            source: { kind: 'interaction', interactionKind: 'slash', command: 'ban', userId: 'u1' }
        });
        expect(report.guild).toEqual({ id: 'g1', name: 'Guild One' });
        expect(report.user).toEqual({ id: 'u1', username: 'uname' });
    });

    it('reports an event under its handler, with an event source', () => {
        const event = {
            name: 'messageCreate',
            handler: 'Starboard',
            args: [{}],
            channelId: 'ch1',
            guild: null,
            user: null
        };
        const report = eventFaultReport(event, new DispatchContext('event', 'messageCreate'), uuid);

        expect(report).toMatchObject({
            origin: 'event:messageCreate:Starboard',
            source: { kind: 'event', eventName: 'messageCreate', handler: 'Starboard', channelId: 'ch1' }
        });
    });
});
