import { Notice } from '@seedcord/kit';
import { NoticeEmbed } from '@seedcord/kit/internal';
import { DiscordAPIError, RESTJSONErrorCodes, TextChannel } from 'discord.js';

import type { Nullable, ReplyResponse } from '@seedcord/types';
import type { Channel, Client, TextChannelResolvable } from 'discord.js';

/**
 * Error thrown when a channel could not be found or accessed.
 */
class CouldNotFindChannel extends Notice {
    constructor(
        message: string,
        public readonly channelId: string
    ) {
        super(message);
    }

    render(): ReplyResponse {
        const embed = new NoticeEmbed(
            `Could not find channel with ID \`${this.channelId}\`. It could also be that the channel is not a text channel.`
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}

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
