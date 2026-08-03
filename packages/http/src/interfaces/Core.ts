import type { HttpConfig } from '@interfaces/Config';
import type { CoreBase } from '@seedcord/core';

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
    readonly config: HttpConfig;
}
