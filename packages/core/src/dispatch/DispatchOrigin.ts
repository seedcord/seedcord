import type { Locale } from 'discord-api-types/v10';

/** The user, guild, and channel that one interaction or event came from. */
export interface DispatchOrigin {
    /** The id of the user who triggered it, or null on an event without a user. */
    readonly userId: string | null;
    /** The guild id, or null outside a guild. */
    readonly guildId: string | null;
    /** The channel id, or null when there isn't one. */
    readonly channelId: string | null;
    /** The language that the user picked in Discord, or null on a gateway event because a discord.js `User` doesn't have one. */
    readonly userLocale: Locale | null;
    /** The guild's preferred language, or null outside a guild. */
    readonly guildLocale: Locale | null;
}
