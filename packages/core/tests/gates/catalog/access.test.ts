import { describe, it, expect } from 'vite-plus/test';

import { DmOnly, GuildOnly, OwnerOnly } from '#gates/catalog/access';
import { NotInDm, NotInGuild, NotOwner } from '#notices/index';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';

function ownerCtx(userId: string | null, ownerIds: string[]): GateContextBase {
    // the gate reads only core.config.ownerIds and userId, so a minimal cast stands in
    const core = { config: { ownerIds } } as unknown as CoreBase;
    return { core, userId } as unknown as GateContextBase;
}

function guildCtx(inGuild: boolean): GateContextBase {
    // the gate reads only guildId, so a minimal cast stands in
    return { guildId: inGuild ? 'g1' : null } as unknown as GateContextBase;
}

describe('OwnerOnly', () => {
    it('passes for a configured owner', async () => {
        await expect(OwnerOnly().check(ownerCtx('o1', ['o1']))).resolves.toBeUndefined();
    });

    it('reads owners assigned to the config after the gate was built', async () => {
        const gate = OwnerOnly();
        const ctx = ownerCtx('o1', []);
        await expect(gate.check(ctx)).rejects.toBeInstanceOf(NotOwner);

        ctx.core.config.ownerIds = ['o1'];
        await expect(gate.check(ctx)).resolves.toBeUndefined();
    });

    it('refuses a non-owner with NotOwner', async () => {
        await expect(OwnerOnly().check(ownerCtx('u2', ['o1']))).rejects.toBeInstanceOf(NotOwner);
    });

    it('refuses when no owners are configured', async () => {
        await expect(OwnerOnly().check(ownerCtx('u2', []))).rejects.toBeInstanceOf(NotOwner);
    });

    it('refuses with NotOwner when the context has a null user id', async () => {
        await expect(OwnerOnly().check(ownerCtx(null, ['o1']))).rejects.toBeInstanceOf(NotOwner);
    });

    it('refuses with the notice class it was given', async () => {
        class AdminsOnly extends NotOwner {}
        await expect(OwnerOnly({ notice: AdminsOnly }).check(ownerCtx('u2', ['o1']))).rejects.toBeInstanceOf(
            AdminsOnly
        );
    });
});

describe('GuildOnly', () => {
    it('passes inside a guild', async () => {
        await expect(GuildOnly().check(guildCtx(true))).resolves.toBeUndefined();
    });

    it('refuses in a DM with NotInGuild', async () => {
        await expect(GuildOnly().check(guildCtx(false))).rejects.toBeInstanceOf(NotInGuild);
    });
});

describe('DmOnly', () => {
    it('passes in a DM', async () => {
        await expect(DmOnly().check(guildCtx(false))).resolves.toBeUndefined();
    });

    it('refuses inside a guild with NotInDm', async () => {
        await expect(DmOnly().check(guildCtx(true))).rejects.toBeInstanceOf(NotInDm);
    });
});
