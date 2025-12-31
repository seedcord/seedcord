import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

/**
 * Validates a Discord bot token.
 *
 * Checks if the token is present, is a string, and matches the general format of a Discord token.
 *
 * @param raw - The raw token value from the environment.
 * @returns The validated token string.
 * @throws A {@link SeedcordError} if the token is missing or invalid.
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

    // Discord token format: [base64-id].[timestamp].[hmac]
    const tokenRegex = /^[A-Za-z\d_-]{24,}\.[A-Za-z\d_-]{6,}\.[A-Za-z\d_-]{27,}$/;

    if (!tokenRegex.test(value)) {
        throw new SeedcordError(SeedcordErrorCode.ConfigIncorrectDiscordToken);
    }

    return value;
}
