import { SeedcordErrorCode } from '@seedcord/errors';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, it, expect, expectTypeOf } from 'vite-plus/test';

import { RequireBotPermissions, RequirePermissions, RequireRole } from '#gates/catalog/permissions';
import { MissingPermissions, MissingRole, NotInGuild, PermissionsUnresolved } from '#notices/index';
import { cardJson } from '#tests/utils/cardText';

import type { AppPermissionsContext, Gate, GateContextBase, GuildPermissionsContext } from '#gates/Gate';

const { Administrator, BanMembers, KickMembers } = PermissionFlagsBits;

interface CtxFields {
    memberPermissions?: bigint | null;
    memberGuildPermissions?: bigint | null;
    appPermissions?: bigint | null;
    appGuildPermissions?: bigint | null;
    guildId?: string | null;
    memberRoleIds?: readonly string[];
}

function permCtx(fields: CtxFields = {}): GuildPermissionsContext & AppPermissionsContext {
    // a minimal cast stands in because the permission gates read only the permission scalars and guild fields
    return {
        memberPermissions: fields.memberPermissions ?? null,
        memberGuildPermissions: fields.memberGuildPermissions ?? null,
        appPermissions: fields.appPermissions ?? 0n,
        appGuildPermissions: fields.appGuildPermissions ?? null,
        guildId: 'guildId' in fields ? fields.guildId : 'g1',
        memberRoleIds: fields.memberRoleIds ?? []
    } as unknown as GuildPermissionsContext & AppPermissionsContext;
}

expectTypeOf(RequirePermissions([BanMembers])).toEqualTypeOf<Gate<GateContextBase, 'RequirePermissions'>>();
expectTypeOf(RequirePermissions([BanMembers], { in: 'guild' })).toEqualTypeOf<
    Gate<GuildPermissionsContext, 'RequirePermissions'>
>();

expectTypeOf(RequireBotPermissions([BanMembers])).toEqualTypeOf<Gate<AppPermissionsContext, 'RequireBotPermissions'>>();
expectTypeOf(RequireBotPermissions([BanMembers], { in: 'guild' })).toEqualTypeOf<
    Gate<GuildPermissionsContext, 'RequireBotPermissions'>
>();

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

    it('refuses with PermissionsUnresolved when the channel set is null inside a guild', async () => {
        await expect(
            RequirePermissions([BanMembers]).check(permCtx({ memberPermissions: null }))
        ).rejects.toBeInstanceOf(PermissionsUnresolved);
    });

    it('reads the guild set with the guild scope', async () => {
        await expect(
            RequirePermissions([BanMembers], { in: 'guild' }).check(
                permCtx({ memberGuildPermissions: BanMembers, memberPermissions: null })
            )
        ).resolves.toBeUndefined();
    });

    it('leads with "You are missing" on the guild-scope refusal', async () => {
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

    it('refuses with PermissionsUnresolved when the guild set is null inside a guild', async () => {
        await expect(
            RequirePermissions([BanMembers], { in: 'guild' }).check(permCtx({ memberGuildPermissions: null }))
        ).rejects.toBeInstanceOf(PermissionsUnresolved);
    });

    it('refuses with NotInGuild outside a guild', async () => {
        await expect(
            RequirePermissions([BanMembers]).check(permCtx({ memberPermissions: null, guildId: null }))
        ).rejects.toBeInstanceOf(NotInGuild);
    });

    it('passes any scope when the Administrator bit is held (channel scope)', async () => {
        await expect(
            RequirePermissions([BanMembers, KickMembers]).check(permCtx({ memberPermissions: Administrator }))
        ).resolves.toBeUndefined();
    });

    it('passes any scope when the Administrator bit is held (guild scope)', async () => {
        await expect(
            RequirePermissions([BanMembers], { in: 'guild' }).check(permCtx({ memberGuildPermissions: Administrator }))
        ).resolves.toBeUndefined();
    });

    it('lists the missing permissions on the refusal', async () => {
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

    it('refuses with the missing class it was given, built with the subject and the missing names', async () => {
        class NoDice extends MissingPermissions {
            public constructor(
                public readonly subject: string | null,
                public readonly names: readonly string[]
            ) {
                super(subject, names);
            }
        }
        let caught: unknown;
        await RequirePermissions([BanMembers, KickMembers], { missing: NoDice })
            .check(permCtx({ memberPermissions: KickMembers }))
            .catch((error: unknown) => {
                caught = error;
            });
        expect(caught).toBeInstanceOf(NoDice);
        expect(caught).toMatchObject({ subject: null, names: ['Ban Members'] });
    });

    it('refuses with the notInGuild and unresolved classes it was given', async () => {
        class Outside extends NotInGuild {}
        class Unknown extends PermissionsUnresolved {}
        const gate = RequirePermissions([BanMembers], { notInGuild: Outside, unresolved: Unknown });
        await expect(gate.check(permCtx({ guildId: null }))).rejects.toBeInstanceOf(Outside);
        await expect(gate.check(permCtx({ memberPermissions: null }))).rejects.toBeInstanceOf(Unknown);
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

    it('puts the bot as the subject on the refusal', async () => {
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

    it('summarises the bot as needing the permission it lacks', async () => {
        let caught: unknown;
        await RequireBotPermissions([BanMembers])
            .check(permCtx({ appPermissions: 0n }))
            .catch((error: unknown) => {
                caught = error;
            });
        // the direction is the point. an earlier draft read "The bot holds Ban Members"
        expect((caught as MissingPermissions).summary).toBe('The bot needs Ban Members');
    });

    it('throws CoreBotMemberMissing when the guild set is null inside a guild', async () => {
        await expect(
            RequireBotPermissions([BanMembers], { in: 'guild' }).check(permCtx({ appGuildPermissions: null }))
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CoreBotMemberMissing });
    });

    it('refuses with NotInGuild outside a guild', async () => {
        await expect(
            RequireBotPermissions([BanMembers]).check(permCtx({ appPermissions: BanMembers, guildId: null }))
        ).rejects.toBeInstanceOf(NotInGuild);
    });

    it('reads the bot guild set with the guild scope', async () => {
        await expect(
            RequireBotPermissions([BanMembers], { in: 'guild' }).check(permCtx({ appGuildPermissions: BanMembers }))
        ).resolves.toBeUndefined();
    });

    it('puts the bot as the subject on the guild-scope refusal', async () => {
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

    it('refuses with the missingRole class it was given, built with the role id', async () => {
        class MembersOnly extends MissingRole {
            public constructor(public readonly roleId: string) {
                super(roleId);
            }
        }
        await expect(
            RequireRole('r1', { missingRole: MembersOnly }).check(permCtx({ memberRoleIds: [] }))
        ).rejects.toMatchObject({ roleId: 'r1' });
    });
});
