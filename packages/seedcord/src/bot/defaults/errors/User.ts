import { CustomError } from '@interfaces/Components';

/**
 * Error thrown when attempting to perform actions on a user not in the guild.
 */
export class UserNotInGuild extends CustomError {
    /**
     * Creates a new UserNotInGuild error.
     *
     * @param message - The error message
     */
    constructor(message = 'User is not in the guild.') {
        super(message);

        this.response.setDescription('User is not in the guild.');
    }
}

/**
 * Error thrown when a requested user cannot be found.
 */
export class UserNotFound extends CustomError {
    /**
     * Creates a new UserNotFound error.
     *
     * @param userArg - The user argument that could not be resolved
     */
    constructor(public readonly userArg: string) {
        super(`User not found: ${userArg}`);

        this.response
            .setTitle('User Not Found')
            .setDescription(
                `User probably doesn't exist or was deleted.\n` +
                    `**User Argument:** \`${this.userArg}\`\n` +
                    `Please check the user ID and try again. Only pass valid user IDs as the argument.`
            );
    }
}
