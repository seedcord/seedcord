import { Guild, GuildMember, PermissionFlagsBits } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { RequireBotPermissions, RequirePermissions, RequireRole } from '@bot/gates/catalog';
import { MissingPermissions, MissingRole, NotInGuild } from '@bot/notices';

import type { InteractionGateContext, NonModalInteraction } from '@bot/gates';

// a Guild instance so checkPermissions takes its `instanceof Guild` branch and reads member.permissions
function guildFake(extra: object = {}): Guild {
    return Object.assign(Object.create(Guild.prototype) as Guild, extra);
}

// a real GuildMember instance so checkPermissions takes its positional form, with permissions and roles
// defined over the prototype getters
function memberWith(perms: bigint[], roles: string[] = []): GuildMember {
    const member = Object.create(GuildMember.prototype) as GuildMember;
    Object.defineProperty(member, 'permissions', { value: { has: (bit: bigint) => perms.includes(bit) } });
    Object.defineProperty(member, 'roles', { value: { cache: new Map(roles.map((role) => [role, { id: role }])) } });
    return member;
}

function ctxOf(member: GuildMember | null, guild: Guild | null): InteractionGateContext<NonModalInteraction> {
    return { member, guild } as unknown as InteractionGateContext<NonModalInteraction>;
}

describe('RequirePermissions', () => {
    it('passes when the caller holds the permissions', async () => {
        const ctx = ctxOf(memberWith([PermissionFlagsBits.BanMembers]), guildFake());
        await expect(RequirePermissions([PermissionFlagsBits.BanMembers]).check(ctx)).resolves.toBeUndefined();
    });

    it('refuses with MissingPermissions when the caller lacks them', async () => {
        const ctx = ctxOf(memberWith([]), guildFake());
        await expect(RequirePermissions([PermissionFlagsBits.BanMembers]).check(ctx)).rejects.toBeInstanceOf(
            MissingPermissions
        );
    });

    it('names the caller in the refusal, not the guild', async () => {
        const member = memberWith([]);
        let caught: unknown;
        await RequirePermissions([PermissionFlagsBits.BanMembers])
            .check(ctxOf(member, guildFake()))
            .catch((error: unknown) => {
                caught = error;
            });
        // the member is the one missing the permission, so the refusal subject must be the member, not the guild
        expect((caught as MissingPermissions).where).toBe(member);
    });

    it('refuses in a DM with NotInGuild', async () => {
        await expect(
            RequirePermissions([PermissionFlagsBits.BanMembers]).check(ctxOf(null, null))
        ).rejects.toBeInstanceOf(NotInGuild);
    });
});

describe('RequireBotPermissions', () => {
    it('passes when the bot holds the permissions', async () => {
        const ctx = ctxOf(memberWith([]), guildFake({ members: { me: memberWith([PermissionFlagsBits.BanMembers]) } }));
        await expect(RequireBotPermissions([PermissionFlagsBits.BanMembers]).check(ctx)).resolves.toBeUndefined();
    });

    it('refuses with MissingPermissions when the bot lacks them', async () => {
        const ctx = ctxOf(memberWith([]), guildFake({ members: { me: memberWith([]) } }));
        await expect(RequireBotPermissions([PermissionFlagsBits.BanMembers]).check(ctx)).rejects.toBeInstanceOf(
            MissingPermissions
        );
    });

    it('refuses outside a guild with NotInGuild', async () => {
        await expect(
            RequireBotPermissions([PermissionFlagsBits.BanMembers]).check(ctxOf(null, null))
        ).rejects.toBeInstanceOf(NotInGuild);
    });
});

describe('RequireRole', () => {
    it('passes when the member has the role', async () => {
        const ctx = ctxOf(memberWith([], ['r1']), guildFake({ roles: { cache: new Map() } }));
        await expect(RequireRole('r1').check(ctx)).resolves.toBeUndefined();
    });

    it('refuses with MissingRole when the member lacks the role', async () => {
        const ctx = ctxOf(memberWith([], []), guildFake({ roles: { cache: new Map([['r1', { name: 'Mods' }]]) } }));
        await expect(RequireRole('r1').check(ctx)).rejects.toBeInstanceOf(MissingRole);
    });

    it('carries the looked-up role on the refusal', async () => {
        const role = { name: 'Mods' };
        const ctx = ctxOf(memberWith([], []), guildFake({ roles: { cache: new Map([['r1', role]]) } }));
        let caught: unknown;
        await RequireRole('r1')
            .check(ctx)
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as MissingRole).role).toBe(role);
    });

    it('falls back to a generic message when the role is not cached', async () => {
        const ctx = ctxOf(memberWith([], []), guildFake({ roles: { cache: new Map() } }));
        let caught: unknown;
        await RequireRole('r1')
            .check(ctx)
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as MissingRole).role).toBeNull();
        expect((caught as MissingRole).message).toBe('You do not have the required role.');
    });

    it('rewords the refusal with the message override', async () => {
        const ctx = ctxOf(memberWith([], []), guildFake({ roles: { cache: new Map([['r1', { name: 'Mods' }]]) } }));
        let caught: unknown;
        await RequireRole('r1', { missingRole: { message: 'Mods only.' } })
            .check(ctx)
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as MissingRole).message).toBe('Mods only.');
    });

    it('refuses in a DM with NotInGuild', async () => {
        await expect(RequireRole('r1').check(ctxOf(null, null))).rejects.toBeInstanceOf(NotInGuild);
    });
});
