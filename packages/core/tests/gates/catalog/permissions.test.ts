import { PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, it, expect, expectTypeOf } from 'vitest';

import { RequireBotPermissions, RequirePermissions, RequireRole } from '#gates/catalog/permissions';
import { MissingPermissions, MissingRole, NotInGuild } from '#notices/index';

import { cardJson } from '../../utils/cardText';

import type { Gate, GateContextBase, GuildPermissionsContext } from '#gates/Gate';

const { Administrator, BanMembers, KickMembers } = PermissionFlagsBits;

interface CtxFields {
    memberPermissions?: bigint | null;
    memberGuildPermissions?: bigint | null;
    appPermissions?: bigint | null;
    appGuildPermissions?: bigint | null;
    guildId?: string | null;
    memberRoleIds?: readonly string[];
}

function permCtx(fields: CtxFields = {}): GuildPermissionsContext {
    // the permission gates read only the permission scalars and guild fields, so a minimal cast stands in
    return {
        memberPermissions: fields.memberPermissions ?? null,
        memberGuildPermissions: fields.memberGuildPermissions ?? null,
        appPermissions: fields.appPermissions ?? null,
        appGuildPermissions: fields.appGuildPermissions ?? null,
        guildId: 'guildId' in fields ? fields.guildId : 'g1',
        memberRoleIds: fields.memberRoleIds ?? []
    } as unknown as GuildPermissionsContext;
}

describe('RequirePermissions', () => {
    it('passes when the channel set holds every scope bit', async () => {
        await expect(
            RequirePermissions([BanMembers]).check(permCtx({ memberPermissions: BanMembers }))
        ).resolves.toBeUndefined();
    });

    it('refuses with MissingPermissions when a scope bit is absent', async () => {
        await expect(
            RequirePermissions([BanMembers]).check(permCtx({ memberPermissions: KickMembers }))
        ).rejects.toBeInstanceOf(MissingPermissions);
    });

    it('refuses with NotInGuild when the channel set is null', async () => {
        await expect(
            RequirePermissions([BanMembers]).check(permCtx({ memberPermissions: null }))
        ).rejects.toBeInstanceOf(NotInGuild);
    });

    it('reads the guild set on the guild arm', async () => {
        await expect(
            RequirePermissions([BanMembers], { in: 'guild' }).check(
                permCtx({ memberGuildPermissions: BanMembers, memberPermissions: null })
            )
        ).resolves.toBeUndefined();
    });

    it('leads with "You are missing" on the guild-arm refusal', async () => {
        let caught: unknown;
        await RequirePermissions([BanMembers], { in: 'guild' })
            .check(permCtx({ memberGuildPermissions: 0n }))
            .catch((error: unknown) => {
                caught = error;
            });
        const text = cardJson((caught as MissingPermissions).render());
        expect(text).toContain('You are missing');
        expect(text).not.toContain('The bot');
    });

    it('refuses with NotInGuild when the guild set is null', async () => {
        await expect(
            RequirePermissions([BanMembers], { in: 'guild' }).check(permCtx({ memberGuildPermissions: null }))
        ).rejects.toBeInstanceOf(NotInGuild);
    });

    it('says the member data is unresolved when the set is null inside a guild', async () => {
        await expect(
            RequirePermissions([BanMembers], { in: 'guild' }).check(
                permCtx({ memberGuildPermissions: null, guildId: 'g1' })
            )
        ).rejects.toThrow('Your server member data could not be resolved. Try again.');
    });

    it('keeps the not-in-guild default when the set is null outside a guild', async () => {
        await expect(
            RequirePermissions([BanMembers]).check(permCtx({ memberPermissions: null, guildId: null }))
        ).rejects.toThrow('This can only be used in a server.');
    });

    it('passes any scope when the Administrator bit is held (channel arm)', async () => {
        await expect(
            RequirePermissions([BanMembers, KickMembers]).check(permCtx({ memberPermissions: Administrator }))
        ).resolves.toBeUndefined();
    });

    it('passes any scope when the Administrator bit is held (guild arm)', async () => {
        await expect(
            RequirePermissions([BanMembers], { in: 'guild' }).check(permCtx({ memberGuildPermissions: Administrator }))
        ).resolves.toBeUndefined();
    });

    it('names the missing permissions on the refusal', async () => {
        let caught: unknown;
        await RequirePermissions([BanMembers, KickMembers])
            .check(permCtx({ memberPermissions: 0n }))
            .catch((error: unknown) => {
                caught = error;
            });
        const text = cardJson((caught as MissingPermissions).render());
        expect(text).toContain('• Ban Members');
        expect(text).toContain('• Kick Members');
    });

    it('rewords the missing refusal with the message override', async () => {
        let caught: unknown;
        await RequirePermissions([BanMembers], { missing: { message: 'no dice' } })
            .check(permCtx({ memberPermissions: 0n }))
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as MissingPermissions).message).toBe('no dice');
        const text = cardJson((caught as MissingPermissions).render());
        expect(text).toContain('no dice');
        expect(text).not.toContain('missing the following permission entries');
    });

    it('replaces the not-in-guild refusal with the notice override', async () => {
        const custom = new NotInGuild('outside');
        await expect(
            RequirePermissions([BanMembers], { notInGuild: { notice: custom } }).check(
                permCtx({ memberPermissions: null })
            )
        ).rejects.toBe(custom);
    });

    it('returns a base-context gate on the channel arm and a guild-context gate on the guild arm', () => {
        expectTypeOf(RequirePermissions([BanMembers])).toEqualTypeOf<Gate<GateContextBase, 'RequirePermissions'>>();
        expectTypeOf(RequirePermissions([BanMembers], { in: 'guild' })).toEqualTypeOf<
            Gate<GuildPermissionsContext, 'RequirePermissions'>
        >();
    });
});

describe('RequireBotPermissions', () => {
    it('passes when the bot channel set holds every scope bit', async () => {
        await expect(
            RequireBotPermissions([BanMembers]).check(permCtx({ appPermissions: BanMembers }))
        ).resolves.toBeUndefined();
    });

    it('refuses with MissingPermissions when the bot lacks a scope bit', async () => {
        await expect(RequireBotPermissions([BanMembers]).check(permCtx({ appPermissions: 0n }))).rejects.toBeInstanceOf(
            MissingPermissions
        );
    });

    it('names the bot as the subject on the refusal', async () => {
        let caught: unknown;
        await RequireBotPermissions([BanMembers])
            .check(permCtx({ appPermissions: 0n }))
            .catch((error: unknown) => {
                caught = error;
            });
        const text = cardJson((caught as MissingPermissions).render());
        expect(text).toContain('The bot is missing');
        expect(text).not.toContain('You are missing');
    });

    it('refuses with NotInGuild when the bot channel set is null', async () => {
        await expect(
            RequireBotPermissions([BanMembers]).check(permCtx({ appPermissions: null }))
        ).rejects.toBeInstanceOf(NotInGuild);
    });

    it('says the bot set is unresolved when null inside a guild', async () => {
        await expect(
            RequireBotPermissions([BanMembers]).check(permCtx({ appPermissions: null, guildId: 'g1' }))
        ).rejects.toThrow("The bot's permissions could not be resolved. Try again.");
    });

    it('keeps the not-in-guild default when the bot set is null outside a guild', async () => {
        await expect(
            RequireBotPermissions([BanMembers]).check(permCtx({ appPermissions: null, guildId: null }))
        ).rejects.toThrow('This can only be used in a server.');
    });

    it('reads the bot guild set on the guild arm', async () => {
        await expect(
            RequireBotPermissions([BanMembers], { in: 'guild' }).check(permCtx({ appGuildPermissions: BanMembers }))
        ).resolves.toBeUndefined();
    });

    it('names the bot as the subject on the guild-arm refusal', async () => {
        let caught: unknown;
        await RequireBotPermissions([BanMembers], { in: 'guild' })
            .check(permCtx({ appGuildPermissions: 0n }))
            .catch((error: unknown) => {
                caught = error;
            });
        const text = cardJson((caught as MissingPermissions).render());
        expect(text).toContain('The bot is missing');
        expect(text).not.toContain('You are missing');
    });

    it('passes any scope when the bot holds the Administrator bit', async () => {
        await expect(
            RequireBotPermissions([BanMembers, KickMembers]).check(permCtx({ appPermissions: Administrator }))
        ).resolves.toBeUndefined();
    });

    it('returns a base-context gate on the channel arm and a guild-context gate on the guild arm', () => {
        expectTypeOf(RequireBotPermissions([BanMembers])).toEqualTypeOf<
            Gate<GateContextBase, 'RequireBotPermissions'>
        >();
        expectTypeOf(RequireBotPermissions([BanMembers], { in: 'guild' })).toEqualTypeOf<
            Gate<GuildPermissionsContext, 'RequireBotPermissions'>
        >();
    });
});

describe('RequireRole', () => {
    it('passes when the member holds the role', async () => {
        await expect(RequireRole('r1').check(permCtx({ memberRoleIds: ['r1'] }))).resolves.toBeUndefined();
    });

    it('refuses with NotInGuild outside a guild', async () => {
        await expect(RequireRole('r1').check(permCtx({ guildId: null }))).rejects.toBeInstanceOf(NotInGuild);
    });

    it('refuses with MissingRole when the member lacks the role', async () => {
        await expect(RequireRole('r1').check(permCtx({ memberRoleIds: ['r2'] }))).rejects.toBeInstanceOf(MissingRole);
    });

    it('mentions the role on the refusal', async () => {
        let caught: unknown;
        await RequireRole('r1')
            .check(permCtx({ memberRoleIds: [] }))
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as MissingRole).message).toBe('You need the <@&r1> role to use this.');
    });
});
