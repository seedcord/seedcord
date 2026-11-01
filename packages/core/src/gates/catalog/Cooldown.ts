import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { parseDuration, type ValidDuration } from '@seedcord/utils';

import { defineEffectGate } from '#gates/Gate';
import { OnCooldown } from '#notices/index';

import type { EffectGate, GateContextBase } from '#gates/Gate';
import type { NoticeConstructor } from '#stops/Notice';
import type { EpochMs } from '@seedcord/types';

/**
 * Options for {@link Cooldown}. `per` sets the bucket the window applies to and `limit` the uses allowed per
 * window. `notice` replaces the refusal.
 *
 * @example
 * ```ts
 * // one use per channel, refusing with your own Notice class
 * class SlowDown extends Notice {
 *     public constructor(resetAt: EpochMs) {
 *         super(`Slow down. Try again <t:${Math.round(resetAt / 1000)}:R>.`);
 *     }
 *
 *     public render(): ReplyResponse {
 *         return { components: [new NoticeCard(this.message).component] };
 *     }
 * }
 *
 * Cooldown('10s', { per: 'channel', notice: SlowDown });
 * ```
 *
 * @example
 * ```ts
 * // five uses per minute, per user
 * Cooldown('1m', { limit: 5 });
 * ```
 */
export interface CooldownOptions {
    /**
     * The bucket the cooldown window applies to. 'user' scopes by user ID (falls back to global when the source carries no user id). 'guild' scopes by guild ID (falls back to global if no guild), and 'channel' scopes by channel ID (falls back to global if no channel).
     *
     * @defaultValue `'user'`
     */
    per?: 'user' | 'guild' | 'channel';
    /**
     * Uses allowed inside one window before the gate refuses.
     *
     * @defaultValue `1`
     */
    limit?: number;
    /** Thrown in place of the default refusal, constructed with the epoch ms the key frees up. */
    notice?: NoticeConstructor<[resetAt: EpochMs]>;
}

// off-route ctxs have no route to key on. each Cooldown() call gets its own id to keep unrelated event handlers isolated
let anonSeq = 0;

function scopeValue(ctx: GateContextBase, per: 'user' | 'guild' | 'channel'): string {
    if (per === 'guild') return ctx.guildId ?? 'global';
    if (per === 'channel') return ctx.channelId ?? 'global';
    return ctx.userId ?? 'global';
}

/**
 * Allows `limit` uses per window, scoped by `per`. A number `duration` is **seconds**, and a string is
 * a duration like `30m` or `24h`. The slot is charged in commit, only after the whole gate set passes,
 * so a later refusal never burns the cooldown.
 * That split also means two requests racing the same key can both pass before either charges the slot.
 * The key combines the handler's route with the window settings, keeping two different handlers on separate
 * windows. Replace the refusal with {@link CooldownOptions.notice}.
 *
 * @param duration - A number is seconds, and a string is a duration like `30m` or `24h`.
 * @param options - Sets the scope with `per`, the uses per window with `limit`, and the refusal with `notice`.
 * @throws A **SeedcordTypeError** when `duration` is a string that doesn't parse.
 * @throws A **SeedcordRangeError** when `duration` is zero or negative.
 *
 * @see the `@Gated` decorator from your transport package
 * @see {@link IRateLimiter}
 *
 * @example
 * ```ts
 * // a number argument is SECONDS
 * \@Gated(Cooldown(5))
 * \@SlashRoute('daily')
 * class DailyHandler extends SlashHandler<'daily'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 *
 * @example
 * ```ts
 * // a string is a duration, here scoped per guild (the default is per user)
 * Cooldown('30m', { per: 'guild' });
 * ```
 *
 * @example
 * ```ts
 * // a burst, 3 uses per 10 minutes per user, then it refuses until a slot frees
 * \@Gated(Cooldown('10m', { limit: 3 }))
 * \@SlashRoute('report')
 * class ReportHandler extends SlashHandler<'report'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function Cooldown(
    duration: number | ValidDuration,
    options?: CooldownOptions
): EffectGate<GateContextBase, 'Cooldown'> {
    let windowMs: number;
    if (typeof duration === 'number') {
        windowMs = duration * 1000;
    } else {
        const parsed = parseDuration(duration);
        if (parsed === null) throw new SeedcordTypeError(SeedcordErrorCode.GateInvalidCooldownDuration, [duration]);
        windowMs = parsed;
    }
    // a zero or negative window would never limit
    if (windowMs <= 0) {
        throw new SeedcordRangeError(SeedcordErrorCode.GateInvalidCooldownDuration, [String(duration)]);
    }

    const per = options?.per ?? 'user';
    // exactOptionalPropertyTypes rejects an explicit undefined key
    const window = options?.limit === undefined ? { windowMs } : { windowMs, limit: options.limit };
    const anonId = anonSeq++;
    // routed keys stay stable across restarts, letting a durable store rebuild the same window
    const keyOf = (ctx: GateContextBase): string =>
        `cooldown:${ctx.declaredRoute ?? `anon${anonId}`}:${per}:w${windowMs}:l${options?.limit ?? 1}:${scopeValue(ctx, per)}`;

    return defineEffectGate(
        'Cooldown',
        async (ctx) => {
            const result = await ctx.core.rateLimiter.peek(keyOf(ctx), window);
            if (!result.limited) return;
            throw new (options?.notice ?? OnCooldown)(result.resetAt);
        },
        async (ctx) => {
            await ctx.core.rateLimiter.charge(keyOf(ctx), window);
        }
    );
}
