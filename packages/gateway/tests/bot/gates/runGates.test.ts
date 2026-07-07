import { GuildMember } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { eventGateContext, interactionGateContext } from '@bot/gates/runGates';

import type { Core } from '@interfaces/Core';
import type { ButtonInteraction } from 'discord.js';

// a real GuildMember instance for the builder's instanceof guard, carrying only what the builder reads
function fakeMember(roleIds: string[], permissionBits: bigint): GuildMember {
    const member = Object.create(GuildMember.prototype) as GuildMember;
    Object.defineProperties(member, {
        roles: { value: { cache: new Map(roleIds.map((id) => [id, {}])) } },
        permissions: { value: { bitfield: permissionBits } }
    });
    return member;
}

describe('interactionGateContext', () => {
    it('builds the interaction arm with the scalar identity', () => {
        // a minimal interaction-shaped fake, the builder only reads these fields
        const interaction = {
            user: { id: 'u1' },
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: null
        } as unknown as ButtonInteraction<'cached'>;
        // the builder never reads core
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.kind).toBe('interaction');
        expect(built.interaction).toBe(interaction);
        expect(built.userId).toBe('u1');
        expect(built.guildId).toBe('g1');
        expect(built.channelId).toBe('c1');
        expect(built.memberRoleIds).toEqual([]);
        expect(built.memberPermissions).toBeNull();
    });

    it('reads role ids and channel-scoped permissions from a cached member', () => {
        const member = fakeMember(['r1', 'r2'], 8n);
        const interaction = {
            user: { id: 'u1' },
            member,
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: { bitfield: 16n }
        } as unknown as ButtonInteraction<'cached'>;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.member).toBe(member);
        expect(built.memberRoleIds).toEqual(['r1', 'r2']);
        // the payload's channel-scoped permissions, so gates read the same bits on every transport
        expect(built.memberPermissions).toBe(16n);
    });

    it('excludes the everyone role from a cached member, matching the raw payload shape', () => {
        // the everyone role's id equals the guild id, and the raw payload's roles array never carries it
        const member = fakeMember(['g1', 'r1'], 8n);
        const interaction = {
            user: { id: 'u1' },
            member,
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: null
        } as unknown as ButtonInteraction<'cached'>;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.memberRoleIds).toEqual(['r1']);
    });

    it('reads role ids off an uncached raw member', () => {
        const interaction = {
            user: { id: 'u1' },
            member: { roles: ['r3'] },
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: null
        } as unknown as ButtonInteraction;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.member).toBeNull();
        expect(built.memberRoleIds).toEqual(['r3']);
    });
});

describe('eventGateContext', () => {
    it('builds the event arm and yields a null actor when the args carry no carrier', () => {
        // empty payload, so deriveEventActor finds no Message, GuildMember, or User to read
        const payload = [] as unknown as Parameters<typeof eventGateContext>[1];
        // the builder never reads core
        const core = {} as unknown as Core;

        const built = eventGateContext('messageCreate', payload, core);

        expect(built.kind).toBe('event');
        expect(built.eventName).toBe('messageCreate');
        expect(built.payload).toBe(payload);
        expect(built.user).toBeNull();
        expect(built.guild).toBeNull();
        expect(built.member).toBeNull();
        expect(built.userId).toBeNull();
        expect(built.guildId).toBeNull();
        expect(built.channelId).toBeNull();
        expect(built.memberRoleIds).toEqual([]);
        expect(built.memberPermissions).toBeNull();
    });

    it('derives the scalars from a member-carrying payload', () => {
        // the cache carries the everyone role (id equals the guild id), the scalar set excludes it
        const member = fakeMember(['g1', 'r1'], 4n);
        Object.defineProperties(member, {
            guild: { value: { id: 'g1' } },
            user: { value: { id: 'u1' } }
        });
        const payload = [member] as unknown as Parameters<typeof eventGateContext>[1];
        const core = {} as unknown as Core;

        const built = eventGateContext('guildMemberAdd', payload, core);

        expect(built.userId).toBe('u1');
        expect(built.guildId).toBe('g1');
        expect(built.memberRoleIds).toEqual(['r1']);
        // events have no channel scope, so these are the member's guild-level bits
        expect(built.memberPermissions).toBe(4n);
    });
});
