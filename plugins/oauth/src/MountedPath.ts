// one of the plugin's routes, at the bot's public address
export class MountedPath {
    // what a browser or discord is sent to
    public readonly url: URL;
    private readonly unprefixed: string;

    // baseUrl is core.url, whose path ends in a slash. path is relative to it, like 'oauth/callback'
    constructor(baseUrl: URL, path: string) {
        this.url = new URL(path, baseUrl);
        this.unprefixed = `/${path}`;
    }

    // a bot served under https://example.com/bot gets /bot/oauth/callback from some proxies and
    // /oauth/callback from ones that strip the prefix
    public matches(pathname: string): boolean {
        return pathname === this.url.pathname || pathname === this.unprefixed;
    }
}
