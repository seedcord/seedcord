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
    /** Sliding-window rate limiting, the `Cooldown` gate's backend and a public direct-use API. */
    readonly rateLimiter: IRateLimiter;
    /** Publish and subscribe to framework and application events. */
    readonly bus: Bus;
    /** Your handlers' records in `config.kv`, under the `app:` prefix. */
    readonly kv: Kv;
}
