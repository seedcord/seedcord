import { fetchText } from './fetchText';

import type { AtleastOneMessageComponent } from '../Types';
import type { Client, Message, TextChannelResolvable } from 'discord.js';

/**
 * Sends a message to a text channel by ID.
 *
 * @param client - The Discord client instance
 * @param channelId - Channel ID or TextChannel instance
 * @param message - Message content to send
 * @returns Promise resolving to the sent message
 * @throws A {@link CouldNotFindChannel} When the channel doesn't exist or isn't text-based
 */
export async function sendInText(
    client: Client,
    channelId: TextChannelResolvable,
    message: AtleastOneMessageComponent
): Promise<Message> {
    const channel = await fetchText(client, channelId);
    return await channel.send(message);
}
