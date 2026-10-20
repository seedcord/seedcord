import { SeedcordErrorCode } from './ErrorCodes';
import { SeedcordError } from './SeedcordError';

const ENV_NAME = 'DISCORD_BOT_TOKEN';

const TOKEN_SOURCE = "the bot token from your application's Bot page";

const URL_SAFE = /[-_]/g;
const STANDARD: Record<string, string> = { '-': '+', _: '/' };
const SNOWFLAKE = /^\d+$/;

function unreadable(cause?: unknown): SeedcordError {
    return new SeedcordError(
        SeedcordErrorCode.ConfigInvalidEnv,
        [
            ENV_NAME,
            TOKEN_SOURCE,
            "Discord builds the first part of a bot token from the application id, but this one doesn't have it. That means the token is truncated, mistyped, or otherwise invalid."
        ],
        { cause }
    );
}

function decode(segment: string): string {
    try {
        return atob(segment.replaceAll(URL_SAFE, (char) => STANDARD[char] ?? char));
    } catch (error) {
        throw unreadable(error);
    }
}

// discord builds a bot token as base64(applicationId) followed by two more dot-separated segments
export function applicationIdFromToken(token: string): string {
    const [first = ''] = token.split('.');
    const decoded = decode(first);

    // a mistyped token can still be valid base64
    if (!SNOWFLAKE.test(decoded)) throw unreadable();

    return decoded;
}

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

    applicationIdFromToken(value);
    return value;
}
