import { TextChannel } from 'discord.js';

import { CouldNotFindChannel } from '../errors/Channels';

import type { Nullish, AtleastOneMessageComponent } from '@seedcord/types';
import type { Channel, Client, Message, TextChannelResolvable } from 'discord.js';

export class ChannelUtils {
  public static async fetchText(client: Client, channelId: TextChannelResolvable): Promise<TextChannel> {
    if (channelId instanceof TextChannel) {
      return channelId;
    }

    let channel: Nullish<Channel> = client.channels.cache.get(channelId);

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

  public static async sendInText(
    client: Client,
    channelId: TextChannelResolvable,
    message: AtleastOneMessageComponent
  ): Promise<Message> {
    const channel = await ChannelUtils.fetchText(client, channelId);
    return await channel.send(message);
  }
}
