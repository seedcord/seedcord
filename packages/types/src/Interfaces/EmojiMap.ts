/**
 * Emoji mapping interface. Augment this to add your project's emoji keys. Make sure to provide the same keys when configuring emojis in your bot config.
 *
 * If you have an emoji that exists in multiple guilds, use the tuple form `[emojiName, guildId]` to specify which guild to fetch it from.
 *
 * @example
 * ```ts
 * declare module 'seedcord' {
 *   interface EmojiMap {
 *     ThumbsUp: string;
 *     ThumbsDown: string;
 *     Lol: [string, string];
 *     Kek: [string, string];
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Or extend it directly
 * declare module 'seedcord' {
 *  export interface EmojiMap extends MyEmojiMap {}
 * }
 * ```
 *
 * @example
 * ```ts
 * // Then, import and use it anywhere in your app
 * import { Emojis } from 'seedcord';
 *
 * console.log(Emojis.ThumbsUp); // <SOME_EMOJI_OBJECT_OR_STRING>
 * ```
 */
export interface EmojiMap {}
