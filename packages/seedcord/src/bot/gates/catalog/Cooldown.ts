import { defineEffectGate } from '../Gate';
import { GateNotice } from './GateNotice';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { EffectGate, GateContextBase } from '../Gate';

/** Refusal shown while a Cooldown is still cooling down. Carries the epoch ms the key frees up. */
export class OnCooldown extends GateNotice {
    public constructor(
        public readonly expires: number,
        message?: string
    ) {
        super(message ?? `You are doing that too fast. Try again <t:${Math.floor(expires / 1000)}:R>.`);
    }
}

/** Cooldown scope, the bucket the one-use-per-window limit applies to. */
export interface CooldownOptions extends GateNoticeOptions {
    /** Defaults to per user. */
    per?: 'user' | 'guild' | 'channel';
}

// each Cooldown() gets its own bucket, so two handlers that both use a cooldown do not share one window
let bucketSeq = 0;

function scopeValue(ctx: GateContextBase, per: 'user' | 'guild' | 'channel'): string {
    if (per === 'guild') return ctx.guildId ?? 'global';
    if (per === 'channel') return ctx.channelId ?? 'global';
    return ctx.user?.id ?? 'global';
}

/** Allows one use per `seconds`, scoped by `per`. The slot is charged in commit, only after the set passes. */
export function Cooldown(seconds: number, options?: CooldownOptions): EffectGate<GateContextBase, 'Cooldown'> {
    const bucket = `cooldown:${bucketSeq++}`;
    const per = options?.per ?? 'user';
    const window = { delay: seconds * 1000 };
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
