import { HasPresentPermissions, MissingPermissions } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Guild, GuildMember, PermissionFlagsBits, PermissionsBitField, Role, TextChannel } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { CannotAssignBotRole, RoleHigherThanMe } from '#bot/notices';
import { checkBotPermissions } from '#bUtilities/permissions/checkBotPermissions';
import { checkPermissions } from '#bUtilities/permissions/checkPermissions';
import { hasPermsToAssign } from '#bUtilities/permissions/hasPermsToAssign';

const { Administrator, BanMembers, ManageRoles, SendMessages } = PermissionFlagsBits;

function guildFake(extra: object = {}): Guild {
    return Object.assign(Object.create(Guild.prototype) as Guild, extra);
}

// id is a prototype getter on discord.js structures
function memberWith(perms: bigint[], id = 'm1'): GuildMember {
    const member = Object.create(GuildMember.prototype) as GuildMember;
    Object.defineProperty(member, 'id', { value: id });
    Object.defineProperty(member, 'permissions', { value: new PermissionsBitField(perms) });
    return member;
}

// the channel resolves its own set, standing in for permissionsFor after overwrites
function channelWith(perms: bigint[], guild?: Guild): TextChannel {
    const channel = Object.create(TextChannel.prototype) as TextChannel;
    Object.defineProperty(channel, 'guild', { value: guild });
    Object.defineProperty(channel, 'permissionsFor', { value: () => new PermissionsBitField(perms) });
    return channel;
}

function roleWith(overrides: Record<string, unknown> & { id: string }): Role {
    return Object.assign(Object.create(Role.prototype) as Role, overrides);
}

function thrownBy(run: () => void): unknown {
    try {
        run();
    } catch (caught) {
        return caught;
    }
    return expect.unreachable('expected a throw');
}

describe('checkPermissions', () => {
    it('passes when the member holds every scoped permission in its base set', () => {
        expect(() => checkPermissions({ for: memberWith([BanMembers]), scope: [BanMembers] })).not.toThrow();
    });

    it('refuses with MissingPermissions that mentions the member', () => {
        const caught = thrownBy(() => checkPermissions({ for: memberWith([], 'm7'), scope: [BanMembers] }));
        expect(caught).toBeInstanceOf(MissingPermissions);
        expect(JSON.stringify((caught as MissingPermissions).render())).toContain('<@m7>');
    });

    it('reads the channel set when given a channel', () => {
        const member = memberWith([SendMessages]);
        expect(() => checkPermissions({ for: member, in: channelWith([]), scope: [SendMessages] })).toThrow(
            MissingPermissions
        );
    });

    it('refuses on the inverse check when a scoped permission is present, and passes when none is', () => {
        expect(() =>
            checkPermissions({ for: memberWith([Administrator]), scope: [Administrator], inverse: true })
        ).toThrow(HasPresentPermissions);
        expect(() => checkPermissions({ for: memberWith([]), scope: [Administrator], inverse: true })).not.toThrow();
    });

    it('refuses with the notice class it was given', () => {
        class Custom extends MissingPermissions {}
        expect(() => checkPermissions({ for: memberWith([]), scope: [BanMembers], notice: Custom })).toThrow(Custom);
    });
});

describe('checkBotPermissions', () => {
    it('passes when the bot member holds the permissions', () => {
        const guild = guildFake({ members: { me: memberWith([BanMembers]) } });
        expect(() => checkBotPermissions({ in: guild, scope: [BanMembers] })).not.toThrow();
    });

    it('refuses with MissingPermissions when the bot lacks them in a channel', () => {
        const guild = guildFake({ members: { me: memberWith([SendMessages]) } });
        expect(() => checkBotPermissions({ in: channelWith([], guild), scope: [SendMessages] })).toThrow(
            MissingPermissions
        );
    });

    it('throws CoreBotMemberMissing when the bot member is uncached, on both arms', () => {
        const guild = guildFake({ id: 'g1', members: { me: null } });
        const uncached = { code: SeedcordErrorCode.CoreBotMemberMissing };
        expect(thrownBy(() => checkBotPermissions({ in: guild, scope: [BanMembers] }))).toMatchObject(uncached);
        expect(thrownBy(() => checkBotPermissions({ in: guild, scope: [BanMembers], inverse: true }))).toMatchObject(
            uncached
        );
    });
});

describe('hasPermsToAssign', () => {
    // botRoleOf reads guild.roles.botRoleFor(guild.client.user), checkBotPermissions reads guild.members.me
    function guildWithBot(mePerms: bigint[]): Guild {
        return guildFake({
            id: 'g1',
            client: { user: {} },
            members: { me: memberWith(mePerms, 'me') },
            roles: { botRoleFor: () => roleWith({ id: 'bot' }) }
        });
    }

    it('refuses with RoleHigherThanMe when the role is at or above the bot', () => {
        const role = roleWith({
            id: 't1',
            managed: false,
            guild: guildWithBot([ManageRoles]),
            comparePositionTo: () => 1
        });
        expect(() => hasPermsToAssign({ role })).toThrow(RoleHigherThanMe);
    });

    it('refuses with CannotAssignBotRole when the role is managed', () => {
        const role = roleWith({
            id: 't1',
            name: 'Booster',
            managed: true,
            guild: guildWithBot([ManageRoles]),
            comparePositionTo: () => -1
        });
        expect(() => hasPermsToAssign({ role })).toThrow(CannotAssignBotRole);
    });

    it('refuses with MissingPermissions when the bot lacks Manage Roles', () => {
        const role = roleWith({ id: 't1', managed: false, guild: guildWithBot([]), comparePositionTo: () => -1 });
        expect(() => hasPermsToAssign({ role })).toThrow(MissingPermissions);
    });

    it('refuses with the higher class it was given, constructed with both roles', () => {
        class TooHigh extends RoleHigherThanMe {}
        const role = roleWith({
            id: 't1',
            managed: false,
            guild: guildWithBot([ManageRoles]),
            comparePositionTo: () => 1
        });
        expect(thrownBy(() => hasPermsToAssign({ role, higher: TooHigh }))).toMatchObject({
            role,
            botRole: { id: 'bot' }
        });
    });
});
