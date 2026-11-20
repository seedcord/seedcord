import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';

const WEB_PROTOCOLS = new Set(['http:', 'https:']);

// what core.url returns on every runtime. fallback is the address that seedcord dev serves the bot at
export function publicUrl(configured: string | URL | undefined, fallback: string | undefined): URL {
    const address = configured ?? fallback;
    if (address === undefined) throw new SeedcordError(SeedcordErrorCode.CoreServerUrlUnset);

    const url = URL.parse(address);
    // 'localhost:3000' parses as a URL whose scheme is "localhost:"
    if (!url || !WEB_PROTOCOLS.has(url.protocol)) {
        throw new SeedcordTypeError(SeedcordErrorCode.CoreServerUrlInvalid, [String(address)]);
    }

    // new URL('callback', url) replaces the last path segment unless the path ends in a slash
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url;
}
