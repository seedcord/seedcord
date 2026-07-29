import type { Config, IRateLimiter } from '@seedcord/types';
import type { Bus } from '@subscribers/Bus';

/**
 * The transport-agnostic slice of the running framework, what core code (gates, notices, plugins'
 * agnostic surface) accesses through `ctx.core`. Each transport's `Core` extends it with its own
 * members.
 */
export interface CoreBase {
    /** Transports narrow this to their own config type. */
    readonly config: Config;
    /** Sliding-window rate limiting, the `Cooldown` gate's backend and a public direct-use API. */
    readonly rateLimiter: IRateLimiter;
    /** Publish and subscribe to framework and application events. */
    readonly bus: Bus;
}
