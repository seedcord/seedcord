import type { REST } from '@discordjs/rest';
import type { CoreBase } from '@seedcord/core';
import type { Config } from '@seedcord/types';

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
 *     db: Mongo;
 *   }
 * }
 * ```
 */
export interface Core extends CoreBase {
    /** Workerd-compatible Discord REST client. */
    readonly rest: REST;
    readonly config: Config;
}
