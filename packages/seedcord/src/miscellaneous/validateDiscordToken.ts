import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';

/**
 * Checks if the token is present, is a string, and matches the general format of a Discord token.
 *
 * @internal
 */
export function validateDiscordToken(raw: unknown): string {
    if (raw === null || raw === undefined) {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingDiscordToken);
    }

    if (typeof raw !== 'string') {
        throw new SeedcordError(SeedcordErrorCode.ConfigIncorrectDiscordToken);
    }

    const value = raw.trim();
    if (value === '') {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingDiscordToken);
    }

    const tokenRegex = /^[A-Za-z\d_-]{24,}\.[A-Za-z\d_-]{6,}\.[A-Za-z\d_-]{27,}$/;

    if (!tokenRegex.test(value)) {
        throw new SeedcordError(SeedcordErrorCode.ConfigIncorrectDiscordToken);
    }

    return value;
}
