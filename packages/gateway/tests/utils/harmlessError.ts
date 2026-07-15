import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

const HTTP_NOT_FOUND = 404;

/** A DiscordAPIError carrying a harmless reply-token code, for the boundary swallow tests. */
export function harmlessError(): DiscordAPIError {
    return new DiscordAPIError(
        { code: RESTJSONErrorCodes.UnknownInteraction, message: 'Unknown interaction' },
        RESTJSONErrorCodes.UnknownInteraction,
        HTTP_NOT_FOUND,
        'POST',
        'https://discord.com/api/interactions/x/y/callback',
        { body: undefined, files: [] }
    );
}
