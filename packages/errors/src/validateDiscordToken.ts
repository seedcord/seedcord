import { SeedcordErrorCode } from './ErrorCodes';
import { SeedcordError, SeedcordTypeError } from './SeedcordError';

const ENV_NAME = 'DISCORD_BOT_TOKEN';

/** @internal */
export function validateDiscordToken(raw: unknown): string {
    if (raw === null || raw === undefined) {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [ENV_NAME]);
    }

    if (typeof raw !== 'string') {
        throw new SeedcordTypeError(SeedcordErrorCode.ConfigInvalidEnv, [ENV_NAME]);
    }

    const value = raw.trim();
    if (value === '') {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [ENV_NAME]);
    }

    const tokenRegex = /^[A-Za-z\d_-]{24,}\.[A-Za-z\d_-]{6,}\.[A-Za-z\d_-]{27,}$/;

    if (!tokenRegex.test(value)) {
        throw new SeedcordTypeError(SeedcordErrorCode.ConfigInvalidEnv, [ENV_NAME]);
    }

    return value;
}
