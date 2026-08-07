/**
 * Registry of Kysely services, augmented per consumer via declaration merging.
 *
 * Declare a member for each class you decorate with `@RegisterKyselyService` to get
 * type-safe access to it.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/plugin-kysely-postgres' {
 *   interface KyselyServices {
 *     'users': Users;
 *   }
 * }
 * ```
 */
export interface KyselyServices {}

/** @internal */
export type KyselyServiceKeys = keyof KyselyServices;
