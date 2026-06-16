import { describe, it, expect, vi } from 'vitest';

import { Cooldown, OnCooldown } from '@bot/gates/catalog';

import type { GateContextBase } from '@bot/gates';
import type { Core } from '@interfaces/Core';

function cdCtx(
    rateLimiter: object,
    ids: { user?: string; guildId?: string; channelId?: string } = {}
): GateContextBase {
    // the gate reads core.rateLimiter and user/guild/channel ids, so a minimal cast stands in
    const core = { rateLimiter } as unknown as Core;
    return {
        core,
        user: { id: ids.user ?? 'u1' },
        guildId: ids.guildId ?? 'g1',
        channelId: ids.channelId ?? 'c1'
    } as unknown as GateContextBase;
}

describe('Cooldown', () => {
    it('refuses with OnCooldown when the key is limited', async () => {
        const rl = { peek: () => ({ limited: true, expires: 1_000_000 }), hit: vi.fn() };
        await expect(Cooldown(5).check(cdCtx(rl))).rejects.toBeInstanceOf(OnCooldown);
    });

    it('passes when the key is not limited', async () => {
        const rl = { peek: () => ({ limited: false, expires: 0 }), hit: vi.fn() };
        await expect(Cooldown(5).check(cdCtx(rl))).resolves.toBeUndefined();
    });

    it('charges the key on commit, not on check', async () => {
        const hit = vi.fn();
        await Cooldown(5).commit(cdCtx({ peek: () => ({ limited: false }), hit }));
        expect(hit).toHaveBeenCalledTimes(1);
    });

    it('keys by the chosen scope', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        await Cooldown(5, { per: 'guild' }).check(cdCtx({ peek, hit: vi.fn() }, { guildId: 'g9' }));
        expect(String(peek.mock.calls[0]?.[0])).toContain('g9');
    });

    it('gives each Cooldown its own bucket', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        const ctx = cdCtx({ peek, hit: vi.fn() });
        await Cooldown(5).check(ctx);
        await Cooldown(5).check(ctx);
        expect(peek.mock.calls[0]?.[0]).not.toBe(peek.mock.calls[1]?.[0]);
    });

    it('carries the rate-limiter retry-after on the refusal', async () => {
        const rl = { peek: () => ({ limited: true, expires: 1_700_000_000_000 }), hit: vi.fn() };
        let caught: unknown;
        await Cooldown(5)
            .check(cdCtx(rl))
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as OnCooldown).expires).toBe(1_700_000_000_000);
    });

    it('rewords the refusal with the message override', async () => {
        const rl = { peek: () => ({ limited: true, expires: 1_000 }), hit: vi.fn() };
        let caught: unknown;
        await Cooldown(5, { message: 'Slow down there.' })
            .check(cdCtx(rl))
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as OnCooldown).message).toBe('Slow down there.');
    });
});
