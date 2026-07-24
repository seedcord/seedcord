/** A capability a plugin declares through `needs`, each surfacing a typed `ctx` field. */
export type PluginNeed = 'client' | 'token' | 'rest';

/**
 * The options a plugin declares as its `Plugin<Opts>` type argument. Authors write unions for `needs`,
 * e.g. `needs: 'token' | 'rest'`.
 */
export interface PluginOptions {
    /**
     * Which transport the plugin runs on.
     * @defaultValue 'both'
     */
    transport?: 'gateway' | 'http' | 'both';
    /**
     * Which runtime the plugin runs on.
     * @defaultValue 'both'
     */
    runtime?: 'server' | 'edge' | 'both';
    /** Capabilities the plugin requests, each a typed `ctx` field. */
    needs?: PluginNeed;
}

/** @internal */
export type TransportOf<Opts extends PluginOptions> = undefined extends Opts['transport']
    ? 'both'
    : NonNullable<Opts['transport']>;

/** @internal */
export type RuntimeOf<Opts extends PluginOptions> = undefined extends Opts['runtime']
    ? 'both'
    : NonNullable<Opts['runtime']>;

/** @internal */
export type NeedsOf<Opts extends PluginOptions> = undefined extends Opts['needs'] ? never : NonNullable<Opts['needs']>;
