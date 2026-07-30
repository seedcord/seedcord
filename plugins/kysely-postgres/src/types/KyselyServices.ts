/**
 * Namespace interface that gets augmented by individual service packages.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe service definitions when using the `@RegisterKyselyService` decorator.
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

/**
 * Union of all registered service keys.
 *
 * @internal
 */
export type KyselyServiceKeys = keyof KyselyServices;
