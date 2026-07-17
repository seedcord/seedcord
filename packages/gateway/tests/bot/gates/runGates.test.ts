import { RequirePermissions } from '@seedcord/core';
import { MissingPermissions } from '@seedcord/core/internal';
import { GuildMember, PermissionFlagsBits } from 'discord.js';
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
            memberPermissions: null,
            appPermissions: { bitfield: 64n }
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
        expect(built.appPermissions).toBe(64n);
        // an uncached member and no bot member leave the guild base sets null
        expect(built.memberGuildPermissions).toBeNull();
        expect(built.appGuildPermissions).toBeNull();
    });

    it('reads role ids and channel-scoped permissions from a cached member', () => {
        const member = fakeMember(['r1', 'r2'], 8n);
        const interaction = {
            user: { id: 'u1' },
            member,
            guild: { members: { me: fakeMember([], 2n) } },
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: { bitfield: 16n },
            appPermissions: { bitfield: 64n }
        } as unknown as ButtonInteraction<'cached'>;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.member).toBe(member);
        expect(built.memberRoleIds).toEqual(['r1', 'r2']);
        // the payload's channel-scoped permissions, so gates read the same bits on every transport
        expect(built.memberPermissions).toBe(16n);
        expect(built.appPermissions).toBe(64n);
        expect(built.memberGuildPermissions).toBe(8n);
        expect(built.appGuildPermissions).toBe(2n);
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
            memberPermissions: null,
            appPermissions: { bitfield: 0n }
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
            memberPermissions: null,
            appPermissions: { bitfield: 0n }
        } as unknown as ButtonInteraction;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.member).toBeNull();
        expect(built.memberRoleIds).toEqual(['r3']);
        // an uncached raw member carries no djs permissions, so the base set is null
        expect(built.memberGuildPermissions).toBeNull();
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
        // no interaction payload on an event, and no member or bot member to read a base set from
        expect(built.appPermissions).toBeNull();
        expect(built.memberGuildPermissions).toBeNull();
        expect(built.appGuildPermissions).toBeNull();
    });

    it('derives the scalars from a member-carrying payload', () => {
        // the cache carries the everyone role (id equals the guild id), the scalar set excludes it
        const member = fakeMember(['g1', 'r1'], 4n);
        Object.defineProperties(member, {
            guild: { value: { id: 'g1', members: { me: fakeMember([], 2n) } } },
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
        // no interaction payload on an event
        expect(built.appPermissions).toBeNull();
        expect(built.memberGuildPermissions).toBe(4n);
        expect(built.appGuildPermissions).toBe(2n);
    });
});

describe('core permission gate over a djs-built context', () => {
    // pins the field wiring from a djs interaction through interactionGateContext to a core gate's check
    function contextFor(channelPerms: bigint): ReturnType<typeof interactionGateContext> {
        const interaction = {
            user: { id: 'u1' },
            member: fakeMember(['r1'], channelPerms),
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: { bitfield: channelPerms },
            appPermissions: { bitfield: 0n }
        } as unknown as ButtonInteraction<'cached'>;
        return interactionGateContext(interaction, {} as unknown as Core);
    }

    it('passes when the member holds the scoped channel permission', async () => {
        await expect(
            RequirePermissions([PermissionFlagsBits.BanMembers]).check(contextFor(PermissionFlagsBits.BanMembers))
        ).resolves.toBeUndefined();
    });

    it('refuses with MissingPermissions when the member lacks it', async () => {
        await expect(
            RequirePermissions([PermissionFlagsBits.BanMembers]).check(contextFor(PermissionFlagsBits.SendMessages))
        ).rejects.toBeInstanceOf(MissingPermissions);
    });
});
