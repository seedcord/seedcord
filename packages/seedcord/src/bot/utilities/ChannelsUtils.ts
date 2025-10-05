import { TextChannel } from 'discord.js';

import { CouldNotFindChannel } from '../errors/Channels';

import type { Nullable, AtleastOneMessageComponent } from '@seedcord/types';
import type { Channel, Client, Message, TextChannelResolvable } from 'discord.js';

/**
 * Utility functions for Discord channel operations.
 */
export class ChannelUtils {
    /**
     * Fetches and validates a text channel.
     *
     * @param client - The Discord client instance
     * @param channelId - Channel ID or TextChannel instance
     * @returns Promise resolving to the text channel
     * @throws A {@link CouldNotFindChannel} When the channel doesn't exist or isn't text-based
     */
    public static async fetchText(client: Client, channelId: TextChannelResolvable): Promise<TextChannel> {
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

    /**
     * Sends a message to a text channel by ID.
     *
     * @param client - The Discord client instance
     * @param channelId - Channel ID or TextChannel instance
     * @param message - Message content to send
     * @returns Promise resolving to the sent message
     * @throws A {@link CouldNotFindChannel} When the channel doesn't exist or isn't text-based
     */
    public static async sendInText(
        client: Client,
        channelId: TextChannelResolvable,
        message: AtleastOneMessageComponent
    ): Promise<Message> {
        const channel = await ChannelUtils.fetchText(client, channelId);
        return await channel.send(message);
    }
}
