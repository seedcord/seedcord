import type { HttpConfig } from '#interfaces/Config';
import type { CoreBase } from '@seedcord/core';
import type { ShutdownTasks, StartupTasks } from '@seedcord/core/node';

/**
 * Main interface for Seedcord core functionality on the HTTP transport.
 *
 * This interface can be augmented via declaration merging to add type-safe plugin definitions when
 * using `this.core` in handlers.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/http' {
 *   interface Core {
 *     db: Mongoose;
 *   }
 * }
 * ```
 */
export interface Core extends CoreBase {
    readonly startup: StartupTasks;
    readonly shutdown: ShutdownTasks; // throws on an edge bot

    readonly config: HttpConfig;
}
