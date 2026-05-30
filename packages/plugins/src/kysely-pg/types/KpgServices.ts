/**
 * Namespace interface that gets augmented by individual service packages.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe service definitions when using the `@RegisterKpgService` decorator.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/plugins' {
 *   interface KpgServices {
 *     'users': Users;
 *   }
 * }
 * ```
 */
export interface KpgServices {}

/**
 * Union of all registered service keys.
 *
 * @internal
 */
export type KpgServiceKeys = keyof KpgServices;
