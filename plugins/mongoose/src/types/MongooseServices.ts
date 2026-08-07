/**
 * Registry of available database services.
 *
 * Declare a member for each class you decorate with `@RegisterMongooseService` to get
 * type-safe access to it.
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

export type MongooseServiceKeys = keyof MongooseServices;
