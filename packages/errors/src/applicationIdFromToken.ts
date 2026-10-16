import { SeedcordErrorCode } from './ErrorCodes';
import { SeedcordError } from './SeedcordError';
import { TOKEN_SOURCE } from './validateDiscordToken';

const URL_SAFE = /[-_]/g;
const STANDARD: Record<string, string> = { '-': '+', _: '/' };
const SNOWFLAKE = /^\d+$/;

function unreadable(cause?: unknown): SeedcordError {
    return new SeedcordError(
        SeedcordErrorCode.ConfigInvalidEnv,
        [
            'DISCORD_BOT_TOKEN',
            TOKEN_SOURCE,
            'Discord builds the first part of a bot token from the application id, but this one holds none, so the token is truncated or mistyped.'
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
