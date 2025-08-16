/**
 * Registry of available database services.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe service definitions when using the \@DatabaseService and \@DatabaseModel decorator.
 *
 * @example
 * ```typescript
 * declare module 'seedcord' {
 *   interface Services {
 *     'user': UserService;
 *     'guild': GuildService;
 *   }
 * }
 * ```
 */
export interface Services {}

/**
 * Helper type to extract service keys from the Services interface.
 */
export type ServiceKeys = keyof Services;
