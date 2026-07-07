import { DiscordAPIError, RESTJSONErrorCodes, TextChannel } from 'discord.js';

import { CouldNotFindChannel } from '@bot/notices';

import type { Nullable } from '@seedcord/types';
import type { Channel, Client, TextChannelResolvable } from 'discord.js';

/**
 * Fetches and validates a text channel. Refuses when the channel doesn't exist or isn't a text channel.
 *
 * @param client - The Discord client instance
 * @param channelId - Channel ID or TextChannel instance
 * @returns Promise resolving to the text channel
 */
export async function fetchText(client: Client, channelId: TextChannelResolvable): Promise<TextChannel> {
    if (channelId instanceof TextChannel) {
        return channelId;
    }

    let channel: Nullable<Channel> = client.channels.cache.get(channelId);

    if (!channel) {
        try {
            channel = await client.channels.fetch(channelId);
        } catch (err) {
            if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownChannel) {
                throw new CouldNotFindChannel('Channel not found or not a text channel', channelId);
            }

            throw err;
        }
    }

    if (channel?.isTextBased()) {
        return channel as TextChannel;
    }

    throw new CouldNotFindChannel('Channel not found or not a text channel', channelId);
}
