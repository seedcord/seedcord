import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';

// what core.url returns on every runtime. fallback is the address that seedcord dev serves the bot at
export function publicUrl(configured: string | URL | undefined, fallback: string | undefined): URL {
    const address = configured ?? fallback;
    if (address === undefined) throw new SeedcordError(SeedcordErrorCode.CoreServerUrlUnset);

    // URL.parse returns a new object, which keeps the slash below off a URL from the config
    const url = URL.parse(address);
    if (!url) throw new SeedcordTypeError(SeedcordErrorCode.CoreServerUrlInvalid, [String(address)]);

    // new URL('callback', url) replaces the last path segment unless the path ends in a slash
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url;
}
