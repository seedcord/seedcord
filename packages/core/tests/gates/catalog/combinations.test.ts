import { describe, it, expect, vi } from 'vitest';

import { GuildOnly, OwnerOnly } from '#gates/catalog/access';
import { Cooldown } from '#gates/catalog/Cooldown';
import { and, or } from '#gates/combinators';
import { runGates } from '#gates/runGates';
import { NotInGuild, NotOwner } from '#notices/index';
import { Notice } from '#stops/Notice';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';

function ctxOf(opts: { guild?: boolean; userId?: string; owners?: string[] }): GateContextBase {
    // the gates read core.config.ownerIds and the id scalars, so a minimal cast stands in
    return {
        core: { config: { ownerIds: opts.owners ?? [] } } as unknown as CoreBase,
        userId: opts.userId ?? 'u1',
        guildId: opts.guild ? 'g1' : null
    } as unknown as GateContextBase;
}

describe('catalog gate combinators', () => {
    it('and passes when both catalog gates pass', async () => {
        await expect(
            and(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: true, userId: 'o1', owners: ['o1'] }))
        ).resolves.toBeUndefined();
    });

    it('and refuses on the first failing catalog gate', async () => {
        await expect(
            and(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: false, userId: 'o1', owners: ['o1'] }))
        ).rejects.toBeInstanceOf(NotInGuild);
    });

    it('and reaches the second catalog gate when the first passes', async () => {
        await expect(
            and(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: true, userId: 'u2', owners: ['o1'] }))
        ).rejects.toBeInstanceOf(NotOwner);
    });

    it('or passes when either catalog gate passes', async () => {
        // an owner outside a guild, OwnerOnly passes so the or passes
        await expect(
            or(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: false, userId: 'o1', owners: ['o1'] }))
        ).resolves.toBeUndefined();
    });

    it('or refuses when both catalog gates refuse', async () => {
        await expect(
            or(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: false, userId: 'u2', owners: ['o1'] }))
        ).rejects.toBeInstanceOf(Notice);
    });

    it('commits a real Cooldown nested in an and after the whole set passes', async () => {
        const charge = vi.fn();
        const rateLimiter = { peek: () => ({ limited: false }), charge };
        const ctx = {
            core: { rateLimiter, config: { ownerIds: [] } },
            userId: 'u1',
            guildId: 'g1',
            channelId: 'c1'
        } as unknown as GateContextBase;

        await runGates([and(GuildOnly(), Cooldown(5))], ctx);

        expect(charge).toHaveBeenCalledTimes(1);
    });
});
