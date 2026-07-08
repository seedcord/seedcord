import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { parseDuration, type ValidDuration } from '@seedcord/utils';

import { defineEffectGate } from '@gates/Gate';
import { OnCooldown } from '@notices/index';

import type { EffectGate, GateContextBase } from '@gates/Gate';
import type { EpochMs } from '@seedcord/types';
import type { Notice } from '@stops/Notice';

/**
 * Options for {@link Cooldown}. `per` sets the bucket the window applies to and `limit` the uses allowed per
 * window. `message` rewords the refusal and `notice` replaces it, both receiving the epoch ms the key frees
 * up so the refusal can show the retry time.
 *
 * @example
 * ```ts
 * // one use per channel, rewording the refusal with the retry time
 * Cooldown('10s', {
 *     per: 'channel',
 *     message: (resetAt) => `Slow down. Try again <t:${Math.round(resetAt / 1000)}:R>.`
 * });
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
     * The bucket the cooldown window applies to. 'user' scopes by user ID, falls back to global when the source carries no user id. 'guild' scopes by guild ID (falls back to global if no guild), and 'channel' scopes by channel ID (falls back to global if no channel).
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
    /**
     * Reword the refusal, keeping the standard notice card. Receives the epoch ms the key frees up, so the
     * text can include the retry time with `<t:${Math.round(resetAt / 1000)}:R>`.
     */
    message?: (resetAt: EpochMs) => string;
    /**
     * Replace the refusal Notice entirely, for full control or a translated copy. Receives the epoch ms the
     * key frees up.
     */
    notice?: (resetAt: EpochMs) => Notice;
}

// off-route ctxs have no route to key on, so each Cooldown() gets its own id to keep unrelated event handlers isolated
let anonSeq = 0;

function scopeValue(ctx: GateContextBase, per: 'user' | 'guild' | 'channel'): string {
    if (per === 'guild') return ctx.guildId ?? 'global';
    if (per === 'channel') return ctx.channelId ?? 'global';
    return ctx.userId ?? 'global';
}

/**
 * Allows `limit` uses per window, scoped by `per`. A number `duration` is **seconds**, a string is
 * a duration like `30m` or `24h`. An unparseable string throws a **SeedcordTypeError** at construction. The
 * slot is charged in commit, only after the whole gate set passes, so a later refusal never burns the cooldown.
 * That split also means two requests racing the same key can both pass before either charges the slot.
 * The key combines the handler's route with the window settings, so two different handlers keep separate
 * windows. Reword the refusal with {@link CooldownOptions.message} or replace it with {@link CooldownOptions.notice}.
 *
 * @param duration - A number is seconds, a string is a duration like `30m` or `24h`. An unparseable string throws a **SeedcordTypeError**.
 * @param options - Sets the scope with `per`, the uses per window with `limit`, and the refusal text with `message` or `notice`.
 *
 * @see the `@Gated` decorator from `seedcord`
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
    // a zero or negative window would never limit, refuse it the same way an unparseable string is refused
    if (windowMs <= 0) {
        throw new SeedcordTypeError(SeedcordErrorCode.GateInvalidCooldownDuration, [String(duration)]);
    }

    const per = options?.per ?? 'user';
    // omit limit when unset so the limiter applies its default of 1, exactOptionalPropertyTypes rejects an explicit undefined
    const window = options?.limit === undefined ? { windowMs } : { windowMs, limit: options.limit };
    const anonId = anonSeq++;
    // routed keys are stable across restarts, so a durable store rebuilds the same window
    const keyOf = (ctx: GateContextBase): string =>
        `cooldown:${ctx.routeId ?? `anon${anonId}`}:${per}:w${windowMs}:l${options?.limit ?? 1}:${scopeValue(ctx, per)}`;

    return defineEffectGate(
        'Cooldown',
        async (ctx) => {
            const result = await ctx.core.rateLimiter.peek(keyOf(ctx), window);
            if (!result.limited) return;
            if (options?.notice) throw options.notice(result.resetAt);
            throw new OnCooldown(result.resetAt, options?.message?.(result.resetAt));
        },
        async (ctx) => {
            await ctx.core.rateLimiter.charge(keyOf(ctx), window);
        }
    );
}
