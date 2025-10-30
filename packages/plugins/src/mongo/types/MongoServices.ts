/**
 * Registry of available database services.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe service definitions when using the \@RegisterMongoService and \@RegisterMongoModel decorator.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/plugins' {
 *   interface MongoServices {
 *     'user': Users;
 *     'guild': Guilds;
 *   }
 * }
 * ```
 */
export interface MongoServices {}

/**
 * Helper type to extract service keys from the Services interface.
 */
export type MongoServiceKeys = keyof MongoServices;
