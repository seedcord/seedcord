import { SeedcordErrorCode } from './ErrorCodes';
import { SeedcordTypeError } from './SeedcordError';

const URL_SAFE = /[-_]/g;
const STANDARD: Record<string, string> = { '-': '+', _: '/' };
const SNOWFLAKE = /^\d+$/;

function decode(segment: string): string {
    try {
        return atob(segment.replaceAll(URL_SAFE, (char) => STANDARD[char] ?? char));
    } catch (error) {
        throw new SeedcordTypeError(SeedcordErrorCode.ConfigTokenUnreadable, { cause: error });
    }
}

// discord builds a bot token as base64(applicationId) followed by two more dot-separated segments
export function applicationIdFromToken(token: string): string {
    const [first = ''] = token.split('.');
    const decoded = decode(first);

    // a mistyped token can still be valid base64
    if (!SNOWFLAKE.test(decoded)) throw new SeedcordTypeError(SeedcordErrorCode.ConfigTokenUnreadable);

    return decoded;
}
