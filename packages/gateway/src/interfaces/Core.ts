import type { Bot } from '@bot/Bot';
import type { GatewayConfig } from '@interfaces/Config';
import type { CoreBase } from '@seedcord/core';
import type { CoordinatedShutdown, CoordinatedStartup } from '@seedcord/core/node/internal';

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
 *     db: Mongoose;
 *   }
 * }
 * ```
 * */
export interface Core extends CoreBase {
    readonly shutdown: Pick<CoordinatedShutdown, 'addTask'>;
    readonly startup: Pick<CoordinatedStartup, 'addTask'>;

    readonly bot: Bot;
    readonly config: GatewayConfig;
}
