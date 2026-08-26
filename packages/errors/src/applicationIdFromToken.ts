import { SeedcordErrorCode } from './ErrorCodes';
import { SeedcordError } from './SeedcordError';

const URL_SAFE = /[-_]/g;
const STANDARD: Record<string, string> = { '-': '+', _: '/' };

// discord builds a bot token as base64(applicationId) followed by two more dot-separated segments
export function applicationIdFromToken(token: string): string {
    const [first = ''] = token.split('.');

    try {
        return atob(first.replaceAll(URL_SAFE, (char) => STANDARD[char] ?? char));
    } catch (error) {
        throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable, { cause: error });
    }
}
