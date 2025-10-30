import type { Config } from './Config';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Plugin } from './Plugin';
import type { Bot } from '@bot/Bot';
import type { EffectsRegistry } from '@effects/EffectsRegistry';
import type { CoordinatedShutdown, CoordinatedStartup } from '@seedcord/services';

/** Base interface defining core Seedcord functionality
 *
 * @internal
 */
export interface BaseCore {
    readonly bot: Bot;
    readonly effects: EffectsRegistry;
    readonly shutdown: CoordinatedShutdown;
    readonly startup: CoordinatedStartup;

    readonly config: Config;

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
export interface Core extends BaseCore {}
