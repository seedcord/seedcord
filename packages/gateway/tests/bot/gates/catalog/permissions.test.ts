import { Notice } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Guild, GuildMember, PermissionFlagsBits, PermissionsBitField, Role, TextChannel } from 'discord.js';
import { describe, it, expect } from 'vite-plus/test';

import { CannotAssignBotRole, RoleHigherThanMe } from '#bot/notices';
import { checkBotPermissions } from '#bUtilities/permissions/checkBotPermissions';
import { checkPermissions } from '#bUtilities/permissions/checkPermissions';
import { hasPermsToAssign } from '#bUtilities/permissions/hasPermsToAssign';

import type { RenderContext } from '@seedcord/types';

const { Administrator, BanMembers, ManageRoles, SendMessages } = PermissionFlagsBits;
const MISSING = 'A required permission is missing.';
const HELD = 'A refused permission is held.';

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

// stands in for permissionsFor after the channel's overwrites
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

    it('refuses with a card that mentions the member', () => {
        const caught = thrownBy(() => checkPermissions({ for: memberWith([], 'm7'), scope: [BanMembers] }));
        expect(caught).toBeInstanceOf(Notice);
        // the permission card reads nothing off the render context
        const card = (caught as Notice).render({} as RenderContext);
        expect(JSON.stringify(card)).toContain('<@m7>');
    });

    it('reads the channel set when given a channel', () => {
        const member = memberWith([SendMessages]);
        expect(() => checkPermissions({ for: member, in: channelWith([]), scope: [SendMessages] })).toThrow(MISSING);
    });

    it('refuses on the inverse check when a scoped permission is present, and passes when none is', () => {
        expect(() =>
            checkPermissions({ for: memberWith([Administrator]), scope: [Administrator], inverse: true })
        ).toThrow(HELD);
        expect(() => checkPermissions({ for: memberWith([]), scope: [Administrator], inverse: true })).not.toThrow();
    });

    it('refuses with the notice class it was given', () => {
        class Custom extends Notice {
            public constructor() {
                super('custom');
            }
        }
        expect(() => checkPermissions({ for: memberWith([]), scope: [BanMembers], notice: Custom })).toThrow(Custom);
    });
});

describe('checkBotPermissions', () => {
    it('passes when the bot member holds the permissions', () => {
        const guild = guildFake({ members: { me: memberWith([BanMembers]) } });
        expect(() => checkBotPermissions({ in: guild, scope: [BanMembers] })).not.toThrow();
    });

    it('refuses when the bot lacks them in a channel', () => {
        const guild = guildFake({ members: { me: memberWith([SendMessages]) } });
        expect(() => checkBotPermissions({ in: channelWith([], guild), scope: [SendMessages] })).toThrow(MISSING);
    });

    it('throws CoreBotMemberMissing when the bot member is uncached, in the guild and in a channel', () => {
        const guild = guildFake({ id: 'g1', members: { me: null } });
        const uncached = { code: SeedcordErrorCode.CoreBotMemberMissing };
        expect(thrownBy(() => checkBotPermissions({ in: guild, scope: [BanMembers] }))).toMatchObject(uncached);
        expect(thrownBy(() => checkBotPermissions({ in: channelWith([], guild), scope: [BanMembers] }))).toMatchObject(
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

    it('refuses when the bot lacks Manage Roles', () => {
        const role = roleWith({ id: 't1', managed: false, guild: guildWithBot([]), comparePositionTo: () => -1 });
        expect(() => hasPermsToAssign({ role })).toThrow(MISSING);
    });

    it('refuses with the higher class it was given, constructed with both roles', () => {
        class TooHigh extends RoleHigherThanMe {}
        const role = roleWith({
            id: 't1',
            managed: false,
            guild: guildWithBot([ManageRoles]),
            comparePositionTo: () => 1
        });
        const caught = thrownBy(() => hasPermsToAssign({ role, higher: TooHigh }));
        expect(caught).toBeInstanceOf(TooHigh);
        expect(caught).toMatchObject({ role, botRole: { id: 'bot' } });
    });
});
