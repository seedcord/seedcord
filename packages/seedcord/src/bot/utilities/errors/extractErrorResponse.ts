import * as crypto from 'node:crypto';

import { Logger } from '@seedcord/services';
import { Envapt } from 'envapt';

import { DatabaseError } from '@bErrors/Database';
import { CustomError } from '@interfaces/Components';
import { Core } from '@interfaces/Core';

import type { Nullable } from '@seedcord/types';
import type { EmbedBuilder, Guild, User } from 'discord.js';
import type { UUID } from 'node:crypto';

const logger = new Logger('ErrorsHandling');

/**
 * Structure representing the extracted error response.
 */
export interface ExtractedErrorResponse {
    /** The unique identifier for the error instance */
    uuid: UUID;
    /** The formatted error response to be sent to the user */
    response: EmbedBuilder;
}

/**
 * Processes an error and extracts the standardized response, if available (else returns a {@link GenericError}).
 *
 * Handles different error types (CustomError, DatabaseError) with appropriate
 * logging, side effects, and user-facing error messages.
 *
 * @param error - The error to process
 * @param core - The core framework instance
 * @param guild - The guild where the error occurred (if any)
 * @param user - The user who triggered the error (if any)
 * @returns Object containing UUID and formatted error response embed
 */
export function extractErrorResponse(
    error: Error,
    core: Core,
    guild: Nullable<Guild>,
    user: Nullable<User>,
    metadata?: unknown
): ExtractedErrorResponse {
    const uuid = crypto.randomUUID();

    if (error instanceof CustomError) {
        if (error instanceof DatabaseError) {
            core.effects.emit('unknownException', { uuid, error, guild, user, metadata });

            logger.error(`DatabaseError: ${error.uuid}`);
        } else if (error.emit) {
            logger.error(`${error.name}: ${error.message}`, error);
        }

        return {
            uuid,
            response: error.response
        };
    }

    const showStack = core.config.bot.errorStack;
    if (showStack) logger.error(uuid, error);
    else logger.error(`${uuid} | ${error.message}`);

    core.effects.emit('unknownException', { uuid, error, guild, user, metadata });

    return {
        uuid,
        response: new GenericError(uuid).response
    };
}

/**
 * Generic error shown to users when an unknown error occurs
 *
 * Set an environment variable called `DEVELOPER_DISCORD_USERNAME` in your `.env` file to customize the contact name.
 */
export class GenericError extends CustomError {
    @Envapt('DEVELOPER_DISCORD_USERNAME')
    private readonly developerUsername: string = 'the developer';

    constructor(private readonly uuid: UUID) {
        super('An unknown error occurred');

        this.response
            .setTitle('Error')
            .setDescription(
                `An unknown error occurred. Please reach out to ${this.developerUsername} with a way to reproduce the error and the following:\n` +
                    `### UUID: \`${this.uuid}\``
            );
    }
}
