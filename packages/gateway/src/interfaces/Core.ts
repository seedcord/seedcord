import type { Bot } from '@bot/Bot';
import type { GatewayConfig } from '@interfaces/Config';
import type { CoreBase } from '@seedcord/core';
import type { CoordinatedShutdown, CoordinatedStartup } from '@seedcord/services';
import type { SeedcordInstance } from '@seedcord/types/internal';
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
 * declare module '@seedcord/gateway' {
 *   interface Core {
 *     db: Mongo;
 *   }
 * }
 * ```
 * */
export interface Core extends CoreBase, SeedcordInstance {
    readonly shutdown: CoordinatedShutdown;
    readonly startup: CoordinatedStartup;

    readonly bot: Bot;
    readonly bus: Bus;
    readonly config: GatewayConfig;

    start(): Promise<this>;
}
