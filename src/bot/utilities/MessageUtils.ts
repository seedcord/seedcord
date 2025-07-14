import { Message, TextChannel, User } from 'discord.js';
import { Nullish } from '../../core/library/types/Miscellaneous';
import { AtleastOneMessageComponent } from '../Types';

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
