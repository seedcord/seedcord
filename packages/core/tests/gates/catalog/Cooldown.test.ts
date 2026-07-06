import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, vi } from 'vitest';

import { Cooldown } from '@gates/catalog/Cooldown';
import { runGates } from '@gates/runGates';
import { OnCooldown } from '@notices/index';
import { Notice } from '@stops/Notice';

import type { GateContextBase } from '@gates/Gate';
import type { CoreBase } from '@interfaces/CoreBase';
import type { ReplyResponse } from '@seedcord/types';

// a full-replacement refusal proving the notice factory receives the runtime retry-after
class CustomRefusal extends Notice {
    constructor(public readonly at: number) {
        super(`wait ${at}`);
    }
    render(): ReplyResponse {
        return { components: [] };
    }
}

function cdCtx(
    rateLimiter: object,
    ids: { userId?: string; guildId?: string; channelId?: string } = {}
): GateContextBase {
    // the gate reads core.rateLimiter and the id scalars, so a minimal cast stands in
    const core = { rateLimiter } as unknown as CoreBase;
    return {
        core,
        userId: ids.userId ?? 'u1',
        guildId: ids.guildId ?? 'g1',
        channelId: ids.channelId ?? 'c1'
    } as unknown as GateContextBase;
}

describe('Cooldown', () => {
    it('refuses with OnCooldown when the key is limited', async () => {
        const rl = { peek: () => ({ limited: true, resetAt: 1_000_000 }), charge: vi.fn() };
        await expect(Cooldown(5).check(cdCtx(rl))).rejects.toBeInstanceOf(OnCooldown);
    });

    it('passes when the key is not limited', async () => {
        const rl = { peek: () => ({ limited: false, resetAt: 0 }), charge: vi.fn() };
        await expect(Cooldown(5).check(cdCtx(rl))).resolves.toBeUndefined();
    });

    it('charges the key on commit, not on check', async () => {
        const charge = vi.fn();
        await Cooldown(5).commit(cdCtx({ peek: () => ({ limited: false }), charge }));
        expect(charge).toHaveBeenCalledTimes(1);
    });

    it('keys by the chosen scope', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        await Cooldown(5, { per: 'guild' }).check(cdCtx({ peek, charge: vi.fn() }, { guildId: 'g9' }));
        expect(String(peek.mock.calls[0]?.[0])).toContain('g9');
    });

    it('gives each Cooldown its own bucket', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        const ctx = cdCtx({ peek, charge: vi.fn() });
        await Cooldown(5).check(ctx);
        await Cooldown(5).check(ctx);
        expect(peek.mock.calls[0]?.[0]).not.toBe(peek.mock.calls[1]?.[0]);
    });

    it('allows `limit` uses within one window, then refuses', async () => {
        const rl = new MemoryRateLimiter();
        const gate = Cooldown(60, { limit: 3 });
        const ctx = cdCtx(rl);

        for (let i = 0; i < 3; i++) {
            await expect(gate.check(ctx)).resolves.toBeUndefined();
            await gate.commit(ctx);
        }

        await expect(gate.check(ctx)).rejects.toBeInstanceOf(OnCooldown);
    });

    it('carries the rate-limiter retry-after on the refusal', async () => {
        const rl = { peek: () => ({ limited: true, resetAt: 1_700_000_000_000 }), charge: vi.fn() };
        let caught: unknown;
        await Cooldown(5)
            .check(cdCtx(rl))
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as OnCooldown).resetAt).toBe(1_700_000_000_000);
    });

    it('rewords the refusal with the message factory, receiving the retry-after', async () => {
        const rl = { peek: () => ({ limited: true, resetAt: 1_700_000_000_000 }), charge: vi.fn() };
        let caught: unknown;
        await Cooldown(5, { message: (resetAt) => `back at ${resetAt}` })
            .check(cdCtx(rl))
            .catch((error: unknown) => {
                caught = error;
            });
        expect((caught as OnCooldown).message).toBe('back at 1700000000000');
    });

    it('replaces the refusal entirely with the notice factory, receiving the retry-after', async () => {
        const rl = { peek: () => ({ limited: true, resetAt: 1_700_000_000_000 }), charge: vi.fn() };
        let received: number | undefined;
        let caught: unknown;
        await Cooldown(5, {
            notice: (resetAt) => {
                received = resetAt;
                return new CustomRefusal(resetAt);
            }
        })
            .check(cdCtx(rl))
            .catch((error: unknown) => {
                caught = error;
            });
        expect(received).toBe(1_700_000_000_000);
        expect(caught).toBeInstanceOf(CustomRefusal);
    });

    it('accepts a duration string and converts it to the window length', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        await Cooldown('30m').check(cdCtx({ peek, charge: vi.fn() }));
        // 30 minutes in ms is the window passed to the limiter
        expect(peek.mock.calls[0]?.[1]).toEqual({ windowMs: 1_800_000 });
    });

    it('rejects a malformed duration literal at compile time', () => {
        // @ts-expect-error 'soon' is not a number-plus-unit duration literal
        expect(() => Cooldown('soon')).toThrow();
    });

    it('throws a SeedcordError for a duration that types but parses to nothing', () => {
        let caught: unknown;
        try {
            // '0s' types as a ValidDuration but parseDuration returns null for it
            Cooldown('0s');
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.GateInvalidCooldownDuration)).toBe(true);
    });

    it.each([0, -1])('throws a SeedcordError for the non-positive numeric duration %d', (duration) => {
        let caught: unknown;
        try {
            Cooldown(duration);
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.GateInvalidCooldownDuration)).toBe(true);
    });

    it('converts a numeric duration from seconds to the window length', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        await Cooldown(30).check(cdCtx({ peek, charge: vi.fn() }));
        expect(peek.mock.calls[0]?.[1]).toEqual({ windowMs: 30_000 });
    });

    it.each([
        ['channel' as const, 'c9', { channelId: 'c9' }],
        ['user' as const, 'u9', { userId: 'u9' }]
    ])('keys by the %s scope', async (per, expected, ids) => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        await Cooldown(5, { per }).check(cdCtx({ peek, charge: vi.fn() }, ids));
        expect(String(peek.mock.calls[0]?.[0])).toContain(expected);
    });

    it('lets two requests racing the same key both pass before either commits', async () => {
        const rl = new MemoryRateLimiter();
        const gate = Cooldown(60);
        const ctxA = cdCtx(rl);
        const ctxB = cdCtx(rl);

        // both checks run before either commit charges, the charge-in-commit trade-off admits both
        await expect(Promise.all([runGates([gate], ctxA), runGates([gate], ctxB)])).resolves.toBeDefined();

        await expect(runGates([gate], cdCtx(rl))).rejects.toBeInstanceOf(OnCooldown);
    });

    // flips when the limiter gains an atomic reserve, the peek/charge split admits both rn
    it.fails('admits exactly one of two requests racing the same key', async () => {
        const rl = new MemoryRateLimiter();
        const gate = Cooldown(60);

        const results = await Promise.allSettled([runGates([gate], cdCtx(rl)), runGates([gate], cdCtx(rl))]);
        const refused = results.filter((result) => result.status === 'rejected');
        expect(refused).toHaveLength(1);
    });

    it('falls back to the global bucket when the scope value is missing', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        const ctx = {
            core: { rateLimiter: { peek, charge: vi.fn() } },
            userId: null,
            guildId: 'g1',
            channelId: 'c1'
        } as unknown as GateContextBase;

        await Cooldown(5).check(ctx);

        expect(String(peek.mock.calls[0]?.[0])).toContain('global');
    });
});
