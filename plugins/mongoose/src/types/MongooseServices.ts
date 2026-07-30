/**
 * Registry of available database services.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe service definitions when using the \@RegisterMongooseService and \@RegisterMongooseModel decorator.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/plugin-mongoose' {
 *   interface MongooseServices {
 *     'user': Users;
 *     'guild': Guilds;
 *   }
 * }
 * ```
 */
export interface MongooseServices {}

/**
 * Helper type to extract service keys from the Services interface.
 */
export type MongooseServiceKeys = keyof MongooseServices;
