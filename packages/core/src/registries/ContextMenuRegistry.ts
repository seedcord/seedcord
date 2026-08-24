import type { RouteCache } from '#registries/SlashRegistry';
import type { ApplicationCommandType } from 'discord-api-types/v10';

/** The two context-menu command kinds Discord defines. */
export type ContextMenuKind = ApplicationCommandType.User | ApplicationCommandType.Message;

/** Everything `seedcord codegen` reads off one context-menu command. */
export interface ContextMenuCommand {
    cache: RouteCache;
}

/**
 * Maps each user context-menu command name to its cache state. `seedcord codegen` populates this. It reads
 * every command's `toJSON()` and emits a `declare module '@seedcord/gateway'` augmentation.
 * `keyof UserContextMenuRegistry` is then the compile-time union of every registered user context-menu
 * name. Never augment it by hand.
 *
 * Kept separate from {@link MessageContextMenuRegistry} because Discord allows a user command and a message
 * command to share a name, so a single name-keyed registry would collapse a legal pair.
 *
 * @example
 * ```ts
 * // seedcord-gen.d.ts (emitted, committed)
 * declare module '@seedcord/gateway' {
 *   interface UserContextMenuRegistry {
 *     'View Profile': { cache: 'cached' };
 *   }
 * }
 * ```
 */
export interface UserContextMenuRegistry {}

/**
 * Maps each message context-menu command name to its cache state. `seedcord codegen` populates this.
 * `keyof MessageContextMenuRegistry` is the compile-time union of every registered message context-menu
 * name. Never augment it by hand.
 *
 * Kept separate from {@link UserContextMenuRegistry}, see that interface for why.
 */
export interface MessageContextMenuRegistry {}

/** The registry holding one kind's command names. */
export type MenuRegistryFor<Kind extends ContextMenuKind> = Kind extends ApplicationCommandType.User
    ? UserContextMenuRegistry
    : MessageContextMenuRegistry;

/** Every command name registered for one context-menu kind. */
export type NamesFor<Kind extends ContextMenuKind> = Extract<keyof MenuRegistryFor<Kind>, string>;

/**
 * The cache state for a context-menu handler's commands, defaulting its `Cache` generic. A handler serving
 * several names takes `undefined` when any one of them is reachable outside a guild.
 */
export type MenuCacheFor<Kind extends ContextMenuKind, Names extends NamesFor<Kind>> =
    undefined extends MenuCacheOf<Kind, Names> ? undefined : 'cached';

// a name the registry cannot answer for falls back to 'cached'
type MenuCacheOf<Kind extends ContextMenuKind, Names extends NamesFor<Kind>> = [Names] extends [never]
    ? 'cached'
    : MenuRegistryFor<Kind>[Names] extends { cache: infer Cache }
      ? Cache
      : 'cached';
