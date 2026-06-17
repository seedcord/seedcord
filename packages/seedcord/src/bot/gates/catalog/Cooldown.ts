import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { parseDuration, type ValidDuration } from '@seedcord/utils';

import { defineEffectGate } from '../Gate';
import { GateNotice } from './GateNotice';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { EffectGate, GateContextBase } from '../Gate';

/**
 * Refusal shown while a Cooldown is still cooling down. Carries the epoch ms the key frees up, which the default
 * message renders as a relative timestamp.
 *
 * @param expires - Epoch ms at which the key frees up, rendered as a relative timestamp by the default message.
 * @param message - Optional text that replaces the default refusal.
 *
 * @example
 * ```ts
 * // refuse from a custom check, freeing up one minute from now
 * defineGate('SlowDown', (ctx) => {
 *     if (tooFast(ctx.user)) throw new OnCooldown(Date.now() + 60_000);
 * });
 * ```
 */
export class OnCooldown extends GateNotice {
    public constructor(
        public readonly expires: number,
        message?: string
    ) {
        super(message ?? `You are doing that too fast. Try again <t:${Math.floor(expires / 1000)}:R>.`);
    }
}

/**
 * Options for {@link Cooldown}. Adds `per` (the bucket the window applies to) and `limit` (uses allowed per
 * window), on top of the shared {@link GateNoticeOptions} (`message` to reword the refusal, `notice` to
 * replace it).
 *
 * @example
 * ```ts
 * // one use per channel, with a reworded refusal
 * Cooldown('10s', { per: 'channel', message: 'Slow down in this channel.' });
 * ```
 *
 * @example
 * ```ts
 * // five uses per minute, per user
 * Cooldown('1m', { limit: 5 });
 * ```
 */
export interface CooldownOptions extends GateNoticeOptions {
    /** Defaults to per user. */
    per?: 'user' | 'guild' | 'channel';
    /** Uses allowed inside one window before the gate refuses. Defaults to 1. */
    limit?: number;
}

// each Cooldown() gets its own bucket, so two handlers that both use a cooldown do not share one window
let bucketSeq = 0;

function scopeValue(ctx: GateContextBase, per: 'user' | 'guild' | 'channel'): string {
    if (per === 'guild') return ctx.guildId ?? 'global';
    if (per === 'channel') return ctx.channelId ?? 'global';
    return ctx.user?.id ?? 'global';
}

/**
 * Allows `limit` uses per window (default 1), scoped by `per`. A number `duration` is **seconds**, a string is
 * a duration like `30m` or `24h`. An unparseable string throws a {@link SeedcordTypeError} at construction. The
 * slot is charged in commit, only after the whole gate set passes, so a later refusal never burns the cooldown.
 * Each call gets its own bucket, so two handlers never share a window. Refuses with {@link OnCooldown}.
 *
 * @param duration - A number is seconds, a string is a duration like `30m` or `24h`. An unparseable string throws a {@link SeedcordTypeError}.
 * @param options - Sets the scope with `per`, the uses per window with `limit`, and the refusal text with `message` or `notice`.
 *
 * @see {@link Gated}
 * @see {@link RateLimiter}
 * @see {@link OnCooldown}
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
 * // a string is a duration, here scoped per guild instead of the default per user
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
            if (result.limited) throw pickNotice(options, (message) => new OnCooldown(result.expires, message));
        },
        (ctx) => {
            ctx.core.rateLimiter.hit(keyOf(ctx), window);
        }
    );
}
