import type { Bot } from '@bot/Bot';
import type { EffectsController } from '@effects/EffectsController';
import type { CoordinatedShutdown, CoordinatedStartup } from '@seedcord/services';
import type { Config } from '@seedcord/types';

/** Base interface defining core Seedcord functionality
 *
 * @internal
 */
export interface BaseCore {
    readonly shutdown: CoordinatedShutdown;
    readonly startup: CoordinatedStartup;

    start(): Promise<this>;
}

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
export interface Core extends BaseCore {
    readonly bot: Bot;
    readonly effects: EffectsController;
    readonly config: Config;
}
