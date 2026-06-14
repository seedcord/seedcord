import { Denial, DenialEmbed } from '@interfaces/Components';

import type { ReplyResponse } from '@seedcord/types';

/**
 * Error thrown when a requested channel cannot be found.
 */
export class ChannelNotFoundError extends Denial {
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
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(`Channel with ID \`${this.channelId}\` not found.`);
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when the bot cannot send embeds in a channel.
 */
export class CannotSendEmbedsError extends Denial {
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
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(
            `Cannot send embeds in <#${this.channelId}>.\n\n` +
                `Please ensure I have the following permissions:\n` +
                `• View Channel\n` +
                `• Send Messages\n` +
                `• Embed Links\n` +
                `• Attach Files\n` +
                `• Read Message History\n` +
                `• Use External Emojis\n`
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when a channel could not be found or accessed.
 */
export class CouldNotFindChannel extends Denial {
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
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(
            `Could not find channel with ID \`${this.channelId}\`. It could also be that the channel is not a text channel.`
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when a channel is not a text channel.
 */
export class ChannelNotTextChannel extends Denial {
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
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(`Channel with ID \`${this.channelId}\` is not a text channel.`);
        return { kind: 'embed', embeds: [embed.component] };
    }
}
