import { CustomError } from '../../interfaces/Components';

export class ChannelNotFoundError extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);

    this.response.setDescription(`Channel with ID \`${this.channelId}\` not found.`);
  }
}

export class CannotSendEmbedsError extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);

    this.response.setDescription(
      `Cannot send embeds in <#${this.channelId}>.\n\n` +
        `Please ensure I have the following permissions:\n` +
        `• View Channel\n` +
        `• Send Messages\n` +
        `• Embed Links\n` +
        `• Attach Files\n` +
        `• Read Message History\n` +
        `• Use External Emojis\n`
    );
  }
}

export class CouldNotFindChannel extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);

    this.response.setDescription(
      `Could not find channel with ID \`${this.channelId}\`. It could also be that the channel is not a text channel.`
    );
  }
}

export class ChannelNotTextChannel extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);

    this.response.setDescription(`Channel with ID \`${this.channelId}\` is not a text channel.`);
  }
}
