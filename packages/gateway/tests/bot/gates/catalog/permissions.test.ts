import { MissingPermissions } from '@seedcord/core/internal';
import { Guild, GuildMember, PermissionFlagsBits, Role } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { HasDangerousPermissions } from '@bot/notices';
import { checkBotPermissions } from '@bUtilities/permissions/checkBotPermissions';
import { checkPermissions } from '@bUtilities/permissions/checkPermissions';
import { hasPermsToAssign } from '@bUtilities/permissions/hasPermsToAssign';

// a Guild instance so checkPermissions takes its `instanceof Guild` branch and reads member.permissions
function guildFake(extra: object = {}): Guild {
    return Object.assign(Object.create(Guild.prototype) as Guild, extra);
}

// a real GuildMember instance so checkPermissions takes its positional form, with permissions and an id for mentionFor
function memberWith(perms: bigint[], id = 'm1'): GuildMember {
    const member = Object.create(GuildMember.prototype) as GuildMember;
    Object.defineProperty(member, 'id', { value: id });
    Object.defineProperty(member, 'permissions', { value: { has: (bit: bigint) => perms.includes(bit) } });
    return member;
}

// a real Role instance so mentionFor and the hierarchy checks resolve
function roleWith(overrides: Record<string, unknown> & { id: string }): Role {
    return Object.assign(Object.create(Role.prototype) as Role, overrides);
}

describe('checkPermissions', () => {
    it('passes when the member holds every scoped permission in a guild', () => {
        expect(() =>
            checkPermissions(memberWith([PermissionFlagsBits.BanMembers]), guildFake(), [
                PermissionFlagsBits.BanMembers
            ])
        ).not.toThrow();
    });

    it('throws MissingPermissions when a permission is missing', () => {
        expect(() => checkPermissions(memberWith([]), guildFake(), [PermissionFlagsBits.BanMembers])).toThrow(
            MissingPermissions
        );
    });

    it('names the checked member as the refusal subject', () => {
        let caught: unknown;
        try {
            checkPermissions(memberWith([], 'm7'), guildFake(), [PermissionFlagsBits.BanMembers]);
        } catch (error) {
            caught = error;
        }
        expect(JSON.stringify((caught as MissingPermissions).render())).toContain('<@m7>');
    });

    it('throws HasDangerousPermissions on the inverse check when a permission is present', () => {
        expect(() =>
            checkPermissions(
                memberWith([PermissionFlagsBits.Administrator]),
                guildFake(),
                [PermissionFlagsBits.Administrator],
                true
            )
        ).toThrow(HasDangerousPermissions);
    });

    it('passes the inverse check when no scoped permission is present', () => {
        expect(() =>
            checkPermissions(memberWith([]), guildFake(), [PermissionFlagsBits.Administrator], true)
        ).not.toThrow();
    });

    it('leads the dangerous-permissions card with the default lead when no message is passed', () => {
        let caught: unknown;
        try {
            checkPermissions(
                memberWith([PermissionFlagsBits.Administrator]),
                guildFake(),
                [PermissionFlagsBits.Administrator],
                true
            );
        } catch (error) {
            caught = error;
        }
        expect(JSON.stringify((caught as HasDangerousPermissions).render())).toContain(
            'has the following permission entries that must not be enabled'
        );
    });

    it('leads the dangerous-permissions card with a custom message when passed', () => {
        const notice = new HasDangerousPermissions('do not touch these', '<@m1>', ['Administrator']);
        expect(JSON.stringify(notice.render())).toContain('do not touch these');
    });

    it('uses a custom missing ctor with the subject and names', () => {
        class Custom extends MissingPermissions {}
        let caught: unknown;
        try {
            checkPermissions(memberWith([]), guildFake(), [PermissionFlagsBits.BanMembers], false, {
                missingNotice: Custom
            });
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(Custom);
    });
});

describe('checkBotPermissions', () => {
    it('passes when the bot member holds the permissions', () => {
        const guild = guildFake({ members: { me: memberWith([PermissionFlagsBits.BanMembers]) } });
        expect(() => checkBotPermissions(guild, [PermissionFlagsBits.BanMembers])).not.toThrow();
    });

    it('throws MissingPermissions when the bot lacks them', () => {
        const guild = guildFake({ members: { me: memberWith([]) } });
        expect(() => checkBotPermissions(guild, [PermissionFlagsBits.BanMembers])).toThrow(MissingPermissions);
    });

    it('throws MissingPermissions when the bot member is uncached', () => {
        const guild = guildFake({ id: 'g1', members: { me: null } });
        expect(() => checkBotPermissions(guild, [PermissionFlagsBits.BanMembers])).toThrow(MissingPermissions);
    });

    it('names the bot on the refusal when the bot member is uncached', () => {
        const guild = guildFake({ id: 'g1', members: { me: null } });
        let caught: unknown;
        try {
            checkBotPermissions(guild, [PermissionFlagsBits.BanMembers]);
        } catch (error) {
            caught = error;
        }
        expect(JSON.stringify((caught as MissingPermissions).render())).toContain('The bot is missing');
    });
});

describe('hasPermsToAssign', () => {
    // getBotRole reads guild.roles.botRoleFor(guild.client.user), checkBotPermissions reads guild.members.me
    function guildWithBot(mePerms: bigint[]): { guild: Guild; botRole: Role } {
        const botRole = roleWith({ id: 'bot' });
        const guild = guildFake({
            id: 'g1',
            client: { user: {} },
            members: { me: memberWith(mePerms, 'me') },
            roles: { botRoleFor: () => botRole }
        });
        return { guild, botRole };
    }

    it('throws when the target role is higher than the bot', () => {
        const { guild } = guildWithBot([PermissionFlagsBits.ManageRoles]);
        const target = roleWith({ id: 't1', managed: false, guild, comparePositionTo: () => 1 });
        expect(() => hasPermsToAssign(target)).toThrow();
    });

    it('throws when the target role is managed', () => {
        const { guild } = guildWithBot([PermissionFlagsBits.ManageRoles]);
        const target = roleWith({ id: 't1', name: 'Booster', managed: true, guild, comparePositionTo: () => -1 });
        expect(() => hasPermsToAssign(target)).toThrow();
    });

    it('throws MissingPermissions when the bot lacks Manage Roles', () => {
        const { guild } = guildWithBot([]);
        const target = roleWith({ id: 't1', managed: false, guild, comparePositionTo: () => -1 });
        expect(() => hasPermsToAssign(target)).toThrow(MissingPermissions);
    });
});
