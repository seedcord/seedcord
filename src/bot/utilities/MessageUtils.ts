import type { Nullish } from '../../core/library/types/Miscellaneous';
import type { AtleastOneMessageComponent } from '../Types';
import type { Message, TextChannel, User } from 'discord.js';

export class MessageUtils {
  public static async send(channel: TextChannel, content: AtleastOneMessageComponent): Promise<Message> {
    const payload = {
      ...(content.content !== undefined && { content: content.content }),
      ...(content.embeds !== undefined && { embeds: [...content.embeds] }),
      ...(content.components !== undefined && {
        components: [...content.components]
      })
    };

    return await channel.send(payload);
  }

  public static async sendDM(user: User, content: AtleastOneMessageComponent): Promise<Nullish<Message>> {
    const payload = {
      ...(content.content !== undefined && { content: content.content }),
      ...(content.embeds !== undefined && { embeds: [...content.embeds] }),
      ...(content.components !== undefined && {
        components: [...content.components]
      })
    };

    try {
      return await user.send(payload);
    } catch {
      return null;
    }
  }
}
