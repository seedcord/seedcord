import { describe, it, expect } from 'vitest';

import { DmOnly, GuildOnly, OwnerOnly } from '@bot/gates/catalog';
import { NotInDm, NotInGuild, NotOwner } from '@bot/notices';

import type { GateContextBase } from '@bot/gates';
import type { Core } from '@interfaces/Core';

function ownerCtx(userId: string | null, ownerIds: string[]): GateContextBase {
    // the gate reads only core.config.ownerIds and user, so a minimal cast stands in
    const core = { config: { ownerIds } } as unknown as Core;
    return { core, user: userId === null ? null : { id: userId } } as unknown as GateContextBase;
}

function guildCtx(inGuild: boolean): GateContextBase {
    // the gate reads only guild, so a minimal cast stands in
    return { guild: inGuild ? {} : null } as unknown as GateContextBase;
}

describe('OwnerOnly', () => {
    it('passes for a configured owner', async () => {
        await expect(OwnerOnly().check(ownerCtx('o1', ['o1']))).resolves.toBeUndefined();
    });

    it('refuses a non-owner with NotOwner', async () => {
        await expect(OwnerOnly().check(ownerCtx('u2', ['o1']))).rejects.toBeInstanceOf(NotOwner);
    });

    it('refuses when no owners are configured', async () => {
        await expect(OwnerOnly().check(ownerCtx('u2', []))).rejects.toBeInstanceOf(NotOwner);
    });

    it('throws the override notice when given one', async () => {
        const custom = new NotOwner('nope');
        await expect(OwnerOnly({ notice: custom }).check(ownerCtx('u2', ['o1']))).rejects.toBe(custom);
    });

    it('rewords the refusal with the message override', async () => {
        let caught: unknown;
        await OwnerOnly({ message: 'Admins only.' })
            .check(ownerCtx('u2', ['o1']))
            .catch((error: unknown) => {
                caught = error;
            });
        expect(caught).toBeInstanceOf(NotOwner);
        expect((caught as NotOwner).message).toBe('Admins only.');
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
