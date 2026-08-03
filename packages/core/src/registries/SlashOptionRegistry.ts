import type { ChannelType } from 'discord-api-types/v10';

/** A slash option kind as a plain string union (`string`, `channel`, ...), keyed to the registry. */
export type OptionKind =
    | 'string'
    | 'integer'
    | 'number'
    | 'boolean'
    | 'user'
    | 'channel'
    | 'role'
    | 'mentionable'
    | 'attachment';

/** The type-relevant shape of one slash option, as emitted by `seedcord codegen` into a registry row. */
export interface SlashOption {
    kind: OptionKind;
    required: boolean;

    // these two are mutually exclusive. Djs makes sure of that.
    choices?: readonly (string | number)[];
    autocomplete?: true;

    // a channel option's declared addChannelTypes, read by the typed view to narrow getChannel
    channelTypes?: readonly ChannelType[];
}

/**
 * Maps each slash route string to its option table. Populated by `seedcord codegen`, which reads every
 * command's `toJSON()` and emits a `declare module '@seedcord/gateway'` augmentation, so `keyof SlashOptionRegistry`
 * is the compile-time union of every registered route. Do not augment it by hand, run `seedcord codegen`.
 *
 * @example
 * ```ts
 * // seedcord-gen.d.ts (emitted, committed)
 * declare module '@seedcord/gateway' {
 *   interface SlashOptionRegistry {
 *     ban: { target: { kind: 'user'; required: true }; reason: { kind: 'string'; required: false } };
 *     'demo/setup': { channel: { kind: 'channel'; required: true } };
 *   }
 * }
 * ```
 */
export interface SlashOptionRegistry {}
