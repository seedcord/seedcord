import { BOT_TOKEN_ENV } from './botTokenKeys';
import { SeedcordErrorCode } from './ErrorCodes';
import { isSnowflake } from './isSnowflake';
import { SeedcordError } from './SeedcordError';

const TOKEN_SOURCE = "the bot token from your application's Bot page";

const URL_SAFE = /[-_]/g;
const STANDARD: Record<string, string> = { '-': '+', _: '/' };

export interface BotToken {
    readonly value: string;
    readonly applicationId: string;
}

function unreadable(cause?: unknown): SeedcordError {
    return new SeedcordError(
        SeedcordErrorCode.ConfigInvalidEnv,
        [
            BOT_TOKEN_ENV,
            TOKEN_SOURCE,
            "Discord builds the first part of a bot token from the application id, but this one doesn't have it. Check that the token wasn't cut off or mistyped."
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
function applicationIdOf(value: string): string {
    const [first = ''] = value.split('.');
    const decoded = decode(first);

    // a mistyped token can still be valid base64
    if (!isSnowflake(decoded)) throw unreadable();

    return decoded;
}

/** @internal */
export function validateDiscordToken(raw: unknown): BotToken {
    if (raw === null || raw === undefined) {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [BOT_TOKEN_ENV]);
    }

    if (typeof raw !== 'string') {
        throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [BOT_TOKEN_ENV, TOKEN_SOURCE]);
    }

    const value = raw.trim();
    if (value === '') {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [BOT_TOKEN_ENV]);
    }

    // a 17-digit application id encodes to 23 chars. apps made before october 2015 have one
    const tokenRegex = /^[A-Za-z\d_-]{23,}\.[A-Za-z\d_-]{6,}\.[A-Za-z\d_-]{27,}$/;

    if (!tokenRegex.test(value)) {
        throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [
            BOT_TOKEN_ENV,
            TOKEN_SOURCE,
            'It does not have the three dot-separated parts of a bot token.'
        ]);
    }

    return { value, applicationId: applicationIdOf(value) };
}
