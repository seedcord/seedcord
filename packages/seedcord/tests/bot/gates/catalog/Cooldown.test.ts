import { Notice } from '@seedcord/core';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, vi } from 'vitest';

import { Cooldown } from '@bot/gates/catalog';
import { OnCooldown } from '@bot/notices';

import type { GateContextBase } from '@bot/gates';
import type { Core } from '@interfaces/Core';
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

    it('accepts a duration string and converts it to the window delay', async () => {
        const peek = vi.fn().mockReturnValue({ limited: false });
        await Cooldown('30m').check(cdCtx({ peek, charge: vi.fn() }));
        // 30 minutes in ms is the window the limiter sees
        expect(peek.mock.calls[0]?.[1]).toEqual({ delay: 1_800_000 });
    });

    it('rejects a malformed duration literal at compile time', () => {
        // @ts-expect-error 'soon' is not a number-plus-unit duration literal
        expect(() => Cooldown('soon')).toThrow();
    });

    it('throws a SeedcordError for a duration that types but parses to nothing', () => {
        let caught: unknown;
        try {
            // '0s' is a valid duration literal by type but parses to 0, not a positive window
            Cooldown('0s');
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.GateInvalidCooldownDuration)).toBe(true);
    });
});
