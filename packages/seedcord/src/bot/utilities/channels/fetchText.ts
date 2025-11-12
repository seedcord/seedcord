import { TextChannel } from 'discord.js';

import { CouldNotFindChannel } from '@bot/defaults/errors/Channels';

import type { Nullable } from '@seedcord/types';
import type { Channel, Client, TextChannelResolvable } from 'discord.js';

/**
 * Fetches and validates a text channel.
 *
 * @param client - The Discord client instance
 * @param channelId - Channel ID or TextChannel instance
 * @returns Promise resolving to the text channel
 * @throws A {@link CouldNotFindChannel} When the channel doesn't exist or isn't text-based
 */
export async function fetchText(client: Client, channelId: TextChannelResolvable): Promise<TextChannel> {
    if (channelId instanceof TextChannel) {
        return channelId;
    }

    let channel: Nullable<Channel> = client.channels.cache.get(channelId);

    if (!channel) {
        try {
            channel = await client.channels.fetch(channelId);
        } catch {
            throw new CouldNotFindChannel('Channel not found or not a text channel', channelId);
        }
    }

    if (channel?.isTextBased()) {
        return channel as TextChannel;
    }

    throw new CouldNotFindChannel('Channel not found or not a text channel', channelId);
}
