import { Notice } from '@seedcord/kit';
import { describe, it, expect, vi } from 'vitest';

import { and, Cooldown, GuildOnly, NotInGuild, NotOwner, or, OwnerOnly } from '@bot/gates';
import { runGates } from '@bot/gates/runGates';

import type { GateContext, GateContextBase } from '@bot/gates';
import type { Core } from '@interfaces/Core';

function ctxOf(opts: { guild?: boolean; userId?: string; owners?: string[] }): GateContextBase {
    // the gates read core.config.ownerIds, user, and guild, so a minimal cast stands in
    return {
        core: { config: { ownerIds: opts.owners ?? [] } } as unknown as Core,
        user: { id: opts.userId ?? 'u1' },
        guild: opts.guild ? {} : null
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
        const hit = vi.fn();
        const rateLimiter = { peek: () => ({ limited: false }), hit };
        const ctx = {
            core: { rateLimiter, config: { ownerIds: [] } },
            user: { id: 'u1' },
            guild: {},
            guildId: 'g1',
            channelId: 'c1'
        } as unknown as GateContext;

        await runGates([and(GuildOnly(), Cooldown(5))], ctx);

        // the and passed, so Cooldown's commit charged the slot
        expect(hit).toHaveBeenCalledTimes(1);
    });
});
