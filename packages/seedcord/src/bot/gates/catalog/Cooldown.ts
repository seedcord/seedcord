import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { parseDuration, type ValidDuration } from '@seedcord/utils';

import { OnCooldown } from '@bot/notices';

import { defineEffectGate } from '../Gate';

import type { EffectGate, GateContextBase } from '../Gate';
import type { Notice } from '@seedcord/kit';
import type { EpochMs } from '@seedcord/types';

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
 *     message: (expires) => `Slow down. Try again <t:${Math.round(expires / 1000)}:R>.`
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
     * The bucket the cooldown window applies to. 'user' scopes by user ID, 'guild' scopes by guild ID (falls back to global if no guild), and 'channel' scopes by channel ID (falls back to global if no channel). If your handler can run in DMs and you want a per-user cooldown, use 'user' and it won't charge a shared global bucket for users without IDs.
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
     * text can include the retry time with `<t:${Math.round(expires / 1000)}:R>`.
     */
    message?: (expires: EpochMs) => string;
    /**
     * Replace the refusal Notice entirely, for full control or a translated copy. Receives the epoch ms the
     * key frees up.
     */
    notice?: (expires: EpochMs) => Notice;
}

// each Cooldown() gets its own bucket, so two handlers that both use a cooldown do not share one window
let bucketSeq = 0;

function scopeValue(ctx: GateContextBase, per: 'user' | 'guild' | 'channel'): string {
    if (per === 'guild') return ctx.guildId ?? 'global';
    if (per === 'channel') return ctx.channelId ?? 'global';
    return ctx.user?.id ?? 'global';
}

/**
 * Allows `limit` uses per window, scoped by `per`. A number `duration` is **seconds**, a string is
 * a duration like `30m` or `24h`. An unparseable string throws a **SeedcordTypeError** at construction. The
 * slot is charged in commit, only after the whole gate set passes, so a later refusal never burns the cooldown.
 * Each call gets its own bucket, so two handlers never share a window. Reword the refusal with {@link CooldownOptions.message}
 * or replace it with {@link CooldownOptions.notice}.
 *
 * @param duration - A number is seconds, a string is a duration like `30m` or `24h`. An unparseable string throws a **SeedcordTypeError**.
 * @param options - Sets the scope with `per`, the uses per window with `limit`, and the refusal text with `message` or `notice`.
 *
 * @see {@link Gated}
 * @see {@link RateLimiter}
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
 * // a string is a duration, here scoped per guild instead of per user
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
    let delay: number;
    if (typeof duration === 'number') {
        delay = duration * 1000;
    } else {
        const parsed = parseDuration(duration);
        if (parsed === null) throw new SeedcordTypeError(SeedcordErrorCode.GateInvalidCooldownDuration, [duration]);
        delay = parsed;
    }

    const bucket = `cooldown:${bucketSeq++}`;
    const per = options?.per ?? 'user';
    // omit limit when unset so the limiter applies its default of 1, exactOptionalPropertyTypes rejects an explicit undefined
    const window = options?.limit === undefined ? { delay } : { delay, limit: options.limit };
    const keyOf = (ctx: GateContextBase): string => `${bucket}:${scopeValue(ctx, per)}`;

    return defineEffectGate(
        'Cooldown',
        (ctx) => {
            const result = ctx.core.rateLimiter.peek(keyOf(ctx), window);
            if (!result.limited) return;
            if (options?.notice) throw options.notice(result.expires);
            throw new OnCooldown(result.expires, options?.message?.(result.expires));
        },
        (ctx) => {
            ctx.core.rateLimiter.hit(keyOf(ctx), window);
        }
    );
}
