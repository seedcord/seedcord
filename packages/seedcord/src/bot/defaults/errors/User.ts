import { Denial, DenialEmbed } from '@interfaces/Components';

import type { ReplyResponse } from '@seedcord/types';

/**
 * Error thrown when attempting to perform actions on a user not in the guild.
 */
export class UserNotInGuild extends Denial {
    /**
     * Creates a new UserNotInGuild error.
     *
     * @param message - The error message
     */
    constructor(message = 'User is not in the guild.') {
        super(message);
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed('User is not in the guild.');
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when a requested user cannot be found.
 */
export class UserNotFound extends Denial {
    /**
     * Creates a new UserNotFound error.
     *
     * @param userArg - The user argument that could not be resolved
     */
    constructor(public readonly userArg: string) {
        super(`User not found: ${userArg}`);
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(
            `User probably doesn't exist or was deleted.\n` +
                `**User Argument:** \`${this.userArg}\`\n` +
                `Please check the user ID and try again. Only pass valid user IDs as the argument.`,
            'User Not Found'
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}
