import type { ApplicationCommandType } from 'discord-api-types/v10';

/** The two context-menu command kinds Discord defines. */
export type ContextMenuKind = ApplicationCommandType.User | ApplicationCommandType.Message;

/**
 * Maps each user context-menu command name to a presence marker. Populated by `seedcord codegen`, which
 * reads every command's `toJSON()` and emits a `declare module '@seedcord/gateway'` augmentation, so
 * `keyof UserContextMenuRegistry` is the compile-time union of every registered user context-menu name.
 * Do not augment it by hand, run `seedcord codegen`.
 *
 * Kept separate from {@link MessageContextMenuRegistry} because Discord allows a user command and a message
 * command to share a name, so a single name-keyed registry would collapse a legal pair.
 *
 * @example
 * ```ts
 * // seedcord-gen.d.ts (emitted, committed)
 * declare module '@seedcord/gateway' {
 *   interface UserContextMenuRegistry {
 *     'View Profile': true;
 *   }
 * }
 * ```
 */
export interface UserContextMenuRegistry {}

/**
 * Maps each message context-menu command name to a presence marker. Populated by `seedcord codegen`, so
 * `keyof MessageContextMenuRegistry` is the compile-time union of every registered message context-menu
 * name. Do not augment it by hand, run `seedcord codegen`.
 *
 * Kept separate from {@link UserContextMenuRegistry}, see that interface for why.
 */
export interface MessageContextMenuRegistry {}
