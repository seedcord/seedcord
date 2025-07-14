import { ErrorKey, ErrorValue } from '../decorators/ErrorConfigurable';
import { BaseErrorEmbed, CustomError } from '../interfaces/Components';

@ErrorKey('ChannelNotFoundError')
export class ChannelNotFoundError extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);
  }
}

@ErrorValue('ChannelNotFoundError')
export class ChannelNotFoundErrorEmbed extends BaseErrorEmbed {
  constructor(error: ChannelNotFoundError) {
    super();
    this.instance.setDescription(`Channel with ID \`${error.channelId}\` not found.`);
  }
}

// ------

@ErrorKey('CannotSendEmbedsError')
export class CannotSendEmbedsError extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);
  }
}

@ErrorValue('CannotSendEmbedsError')
export class CannotSendEmbedsEmbed extends BaseErrorEmbed {
  constructor(error: CannotSendEmbedsError) {
    super();
    this.instance.setDescription(
      `Cannot send embeds in <#${error.channelId}>.\n\n` +
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

// ------
@ErrorKey('CouldNotFindChannel')
export class CouldNotFindChannel extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);
  }
}

@ErrorValue('CouldNotFindChannel')
export class CouldNotFindChannelEmbed extends BaseErrorEmbed {
  constructor(error: CouldNotFindChannel) {
    super();
    this.instance.setDescription(
      `Could not find channel with ID \`${error.channelId}\`. It could also be that the channel is not a text channel.`
    );
  }
}

// ------
@ErrorKey('ChannelNotTextChannel')
export class ChannelNotTextChannel extends CustomError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message);
  }
}

@ErrorValue('ChannelNotTextChannel')
export class ChannelNotTextChannelEmbed extends BaseErrorEmbed {
  constructor(error: ChannelNotTextChannel) {
    super();
    this.instance.setDescription(`Channel with ID \`${error.channelId}\` is not a text channel.`);
  }
}
