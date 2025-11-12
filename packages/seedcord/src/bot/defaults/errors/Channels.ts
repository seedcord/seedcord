import { CustomError } from '@interfaces/Components';

/**
 * Error thrown when a requested channel cannot be found.
 */
export class ChannelNotFoundError extends CustomError {
    /**
     * Creates a new ChannelNotFoundError.
     *
     * @param message - The error message
     * @param channelId - The ID of the channel that could not be found
     */
    constructor(
        message: string,
        public readonly channelId: string
    ) {
        super(message);

        this.response.setDescription(`Channel with ID \`${this.channelId}\` not found.`);
    }
}

/**
 * Error thrown when the bot cannot send embeds in a channel.
 */
export class CannotSendEmbedsError extends CustomError {
    /**
     * Creates a new CannotSendEmbedsError.
     *
     * @param message - The error message
     * @param channelId - The ID of the channel where embeds cannot be sent
     */
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

/**
 * Error thrown when a channel could not be found or accessed.
 */
export class CouldNotFindChannel extends CustomError {
    /**
     * Creates a new CouldNotFindChannel error.
     *
     * @param message - The error message
     * @param channelId - The ID of the channel that could not be found
     */
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

/**
 * Error thrown when a channel is not a text channel.
 */
export class ChannelNotTextChannel extends CustomError {
    /**
     * Creates a new ChannelNotTextChannel error.
     *
     * @param message - The error message
     * @param channelId - The ID of the channel that is not a text channel
     */
    constructor(
        message: string,
        public readonly channelId: string
    ) {
        super(message);

        this.response.setDescription(`Channel with ID \`${this.channelId}\` is not a text channel.`);
    }
}
