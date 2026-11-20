import type { Kv } from '#src/kv/Kv';
import type { PluginRegistry } from '#src/plugin/PluginRegistry';
import type { Bus } from '#subscribers/Bus';
import type { REST } from '@discordjs/rest';
import type { Config, IRateLimiter } from '@seedcord/types';
import type { HostPlugins } from '@seedcord/types/internal';

/**
 * The transport-agnostic slice of the running framework, what core code (gates, notices, plugins'
 * agnostic surface) accesses through `ctx.core`. Each transport's `Core` extends it with its own
 * members.
 */
export interface CoreBase {
    /** @internal */
    readonly [HostPlugins]: PluginRegistry;
    /** Transports narrow this to their own config type. */
    readonly config: Config;
    /**
     * Discord REST client. On gateway this is the discord.js client's own, and it doesn't carry a token
     * until the Login phase. On http the token is set by `start()`.
     */
    readonly rest: REST;
    /** The bot's Discord application id. Throws if you read it before the host resolves it. */
    readonly applicationId: string;
    /**
     * The address people reach your bot at, from `server.url` in your config. Its path always ends in
     * a slash.
     *
     * Under `seedcord dev`, a bot without `server.url` gets its localhost address, and an http bot
     * whose `dev.tunnel` is a URL gets that URL.
     *
     * @throws A **SeedcordError** when you read it and you haven't set `server.url` unless `seedcord dev` gave the bot an address.
     * @throws A **SeedcordTypeError** when you read it and `server.url` isn't an http or https address.
     * @example
     * ```ts
     * // with server.url set to 'https://example.com/bot'
     * new URL('callback', core.url).href; // 'https://example.com/bot/callback'
     * ```
     */
    readonly url: URL;
    /** Sliding-window rate limiting, the `Cooldown` gate's backend and a public direct-use API. */
    readonly rateLimiter: IRateLimiter;
    /** Publish and subscribe to framework and application events. */
    readonly bus: Bus;
    /** Your handlers' records in `config.kv`, under the `app:` prefix. */
    readonly kv: Kv;
}
