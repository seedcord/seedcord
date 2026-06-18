import type { Bot } from '@bot/Bot';
import type { RateLimiter, CoordinatedShutdown, CoordinatedStartup } from '@seedcord/services';
import type { Config, SeedcordInstance } from '@seedcord/types';
import type { Bus } from '@subscribers/Bus';

/**
 * Main interface for Seedcord core functionality
 *
 * This interface can be augmented via declaration merging to add
 * type-safe plugin definitions when using `this.core#` in handlers.
 *
 * Only add classes that extend {@link Plugin} to this
 *
 * @example
 * ```typescript
 * declare module 'seedcord' {
 *   interface Core {
 *     db: Mongo;
 *   }
 * }
 * ```
 * */
export interface Core extends SeedcordInstance {
    readonly shutdown: CoordinatedShutdown;
    readonly startup: CoordinatedStartup;

    readonly bot: Bot;
    readonly bus: Bus;
    readonly config: Config;
    readonly rateLimiter: RateLimiter;

    start(): Promise<this>;
}
