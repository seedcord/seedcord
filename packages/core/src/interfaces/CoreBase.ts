import type { Bus } from '#subscribers/Bus';
import type { REST } from '@discordjs/rest';
import type { Config, IRateLimiter } from '@seedcord/types';

/**
 * The transport-agnostic slice of the running framework, what core code (gates, notices, plugins'
 * agnostic surface) accesses through `ctx.core`. Each transport's `Core` extends it with its own
 * members.
 */
export interface CoreBase {
    /** Transports narrow this to their own config type. */
    readonly config: Config;
    /**
     * Discord REST client. On gateway this is the discord.js client's own, and it carries no token
     * until the Login phase. On http the token is set by `start()`.
     */
    readonly rest: REST;
    /** Sliding-window rate limiting, the `Cooldown` gate's backend and a public direct-use API. */
    readonly rateLimiter: IRateLimiter;
    /** Publish and subscribe to framework and application events. */
    readonly bus: Bus;
}
