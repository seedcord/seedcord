import { SeedcordErrorCode } from './ErrorCodes';
import { SeedcordError } from './SeedcordError';

const ENV_NAME = 'DISCORD_BOT_TOKEN';

export const TOKEN_SOURCE = "the bot token from your application's Bot page";

/** @internal */
export function validateDiscordToken(raw: unknown): string {
    if (raw === null || raw === undefined) {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [ENV_NAME]);
    }

    if (typeof raw !== 'string') {
        throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [ENV_NAME, TOKEN_SOURCE]);
    }

    const value = raw.trim();
    if (value === '') {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [ENV_NAME]);
    }

    const tokenRegex = /^[A-Za-z\d_-]{24,}\.[A-Za-z\d_-]{6,}\.[A-Za-z\d_-]{27,}$/;

    if (!tokenRegex.test(value)) {
        throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [
            ENV_NAME,
            TOKEN_SOURCE,
            'It does not have the three dot-separated parts of a bot token.'
        ]);
    }

    return value;
}
