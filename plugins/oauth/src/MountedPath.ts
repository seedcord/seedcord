import { trimStart } from 'es-toolkit';

// a bot can be hosted under a path, like https://example.com/bot. some proxies pass the request on as
// /bot/oauth/callback, and some cut the /bot part off first. matches() accepts both.

export class MountedPath {
    public readonly url: URL;
    private readonly unprefixed: string;

    constructor(baseUrl: string | URL, path: string) {
        const base = new URL(baseUrl);
        // new URL() replaces the last part of a base that doesn't end in a slash, and a path that starts
        // with one replaces the whole base path
        if (!base.pathname.endsWith('/')) base.pathname += '/';
        const route = trimStart(path, '/');

        this.url = new URL(route, base);
        this.unprefixed = `/${route}`;
    }

    public matches(pathname: string): boolean {
        return pathname === this.url.pathname || pathname === this.unprefixed;
    }
}
