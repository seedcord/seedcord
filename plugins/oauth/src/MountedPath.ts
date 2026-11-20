// one route of a plugin, like 'oauth/callback', at wherever the bot is hosted.
//
// we need this because a bot can be hosted under a path, like https://example.com/bot. some proxies pass
// the request on as /bot/oauth/callback, and some cut the /bot part off first. a route has to match both.

type WithoutLeadingSlash<TPath extends string> = TPath extends `/${string}`
    ? `Write '${TPath}' without the slash at its start.`
    : TPath;

export class MountedPath<TPath extends string = string> {
    public readonly url: URL;
    private readonly unprefixed: string;

    // baseUrl is core.url, whose path ends in a slash. without that slash, new URL() replaces its last part
    constructor(baseUrl: URL, path: WithoutLeadingSlash<TPath>) {
        this.url = new URL(path, baseUrl);
        this.unprefixed = `/${path}`;
    }

    public matches(pathname: string): boolean {
        return pathname === this.url.pathname || pathname === this.unprefixed;
    }
}
