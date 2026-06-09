/** A slash option kind, named for the registry rather than the raw discord.js `ApplicationCommandOptionType` int. */
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
}

/**
 * Maps each slash route string to its option table. Populated by `seedcord codegen`, which reads every
 * command's `toJSON()` and emits a `declare module 'seedcord'` augmentation, so `keyof SlashOptionRegistry`
 * is the compile-time union of every registered route. Do not augment it by hand, run `seedcord codegen`.
 *
 * @example
 * ```ts
 * // generated/slash-registry.gen.ts (emitted, committed)
 * declare module 'seedcord' {
 *   interface SlashOptionRegistry {
 *     ban: { target: { kind: 'user'; required: true }; reason: { kind: 'string'; required: false } };
 *     'demo/setup': { channel: { kind: 'channel'; required: true } };
 *   }
 * }
 * ```
 */
export interface SlashOptionRegistry {}
