import { Denial, DenialEmbed } from '@seedcord/kit';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

import type { ReplyResponse } from '@seedcord/types';
import type { Client, User } from 'discord.js';

/**
 * Error thrown when a requested user cannot be found.
 */
class UserNotFound extends Denial {
    constructor(public readonly userArg: string) {
        super(`User not found: ${userArg}`);
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(
            `User probably doesn't exist or was deleted.\n` +
                `**User Argument:** \`${this.userArg}\`\n` +
                `Please check the user ID and try again. Only pass valid user IDs as the argument.`,
            'User Not Found'
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Options for {@link fetchUser}.
 */
export interface FetchUserOptions {
    /** Denial to throw when the user does not exist. Defaults to {@link UserNotFound}. */
    throwAs?: new (userArg: string) => Denial;
}

/**
 * Fetches a Discord user by ID with error handling.
 *
 * @param client - The Discord client instance
 * @param userId - The Discord user ID
 * @param options - Optional overrides, including the {@link FetchUserOptions.throwAs} denial
 * @returns Promise resolving to the user
 * @throws The {@link FetchUserOptions.throwAs} denial (default {@link UserNotFound}) when the user doesn't exist
 */
export async function fetchUser(client: Client, userId: string, options?: FetchUserOptions): Promise<User> {
    const Throw = options?.throwAs ?? UserNotFound;

    let user = client.users.cache.get(userId);
    user ??= await client.users.fetch(userId).catch((err) => {
        if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownUser) {
            throw new Throw(userId);
        }

        throw err;
    });

    return user;
}
