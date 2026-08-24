import type { ChannelType } from 'discord-api-types/v10';

/** A slash option kind as a plain string union (`string`, `channel`, ...), keyed to the registry. */
export type OptionKind =
    'string' | 'integer' | 'number' | 'boolean' | 'user' | 'channel' | 'role' | 'mentionable' | 'attachment';

/**
 * The cache state a command's interaction arrives in, read from the `contexts` it declares. A guild-only
 * command is `'cached'`. A command a DM or a private channel can reach is `undefined`, since no guild
 * backs it.
 */
export type RouteCache = 'cached' | undefined;

/** The type-relevant shape of one slash option, as emitted by `seedcord codegen` into a registry row. */
export interface SlashOption {
    kind: OptionKind;
    required: boolean;

    // these two are mutually exclusive. djs makes sure of that.
    choices?: readonly (string | number)[];
    autocomplete?: true;

    // a channel option's declared addChannelTypes, read by the typed view to narrow getChannel
    channelTypes?: readonly ChannelType[];
}

/** Everything `seedcord codegen` reads off one slash route. */
export interface SlashRoute {
    options: Record<string, SlashOption>;
    cache: RouteCache;
}

/**
 * Maps each slash route string to its options and its cache state. `seedcord codegen` populates this. It
 * reads every command's `toJSON()` and emits a `declare module '@seedcord/gateway'` augmentation.
 * `keyof SlashRegistry` is then the compile-time union of every registered route. Never augment it by hand.
 *
 * @example
 * ```ts
 * // seedcord-gen.d.ts (emitted, committed)
 * declare module '@seedcord/gateway' {
 *   interface SlashRegistry {
 *     ban: { options: { target: { kind: 'user'; required: true } }; cache: 'cached' };
 *     help: { options: {}; cache: undefined };
 *   }
 * }
 * ```
 */
export interface SlashRegistry {}

/**
 * The cache state for a handler's route, defaulting a handler's `Cache` generic. A handler serving several
 * routes takes `undefined` when any one of them is reachable outside a guild.
 */
export type CacheFor<Route extends keyof SlashRegistry> = undefined extends CacheOf<Route> ? undefined : 'cached';

// a route the registry cannot answer for falls back to 'cached'
type CacheOf<Route extends keyof SlashRegistry> = [Route] extends [never]
    ? 'cached'
    : SlashRegistry[Route] extends { cache: infer Cache }
      ? Cache
      : 'cached';
