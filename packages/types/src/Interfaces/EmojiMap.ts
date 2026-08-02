/**
 * The configured emoji keys, written by `seedcord codegen` from `config.bot.emojis`. Each key maps to a tag,
 * `'application'` for a plain name and `'guild'` for a `[name, guildId]` tuple. Gateway reads that tag to
 * type each emoji as the precise `ApplicationEmoji` or `GuildEmoji`. http resolves both tags to one
 * `ResolvedEmoji`. Do not augment it by hand, run `seedcord codegen` after changing `config.bot.emojis`.
 *
 * @example
 * ```ts
 * // configure once in your bot config (a name, or a [name, guildId] tuple for a specific guild)
 * emojis: { ThumbsUp: 'thumbs_up', Lol: ['lol', '000000000000000000'] }
 * ```
 *
 * @example
 * ```ts
 * // after `seedcord codegen`, use it anywhere
 * import { Emojis } from '@seedcord/gateway';
 * Emojis.ThumbsUp; // ApplicationEmoji
 * Emojis.Lol; // GuildEmoji
 * ```
 */
export interface EmojiMap {}

/**
 * The shape of `config.bot.emojis`, a plain map you write yourself. Each value is an emoji name, or a
 * `[name, guildId]` tuple to pin a guild emoji. `seedcord codegen` reads this to generate {@link EmojiMap}.
 */
export type EmojiConfig = Record<string, string | readonly [string, string]>;
