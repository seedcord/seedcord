import type { TypedExclude } from '@seedcord/types';

/** A capability a plugin declares through `needs`, each surfacing a typed `ctx` field. */
export type PluginNeed = 'client' | 'token' | 'rest';

/**
 * The options a plugin declares as its `Plugin<Opts>` type argument. Authors write unions for `needs`,
 * e.g. `needs: 'token' | 'rest'`.
 */
export interface PluginOptions {
    /**
     * Which transport the plugin runs on. `'any'` attaches to either one.
     * @defaultValue 'any'
     */
    transport?: 'gateway' | 'http' | 'any';
    /**
     * Which runtime the plugin runs on. `'any'` attaches to either one.
     * @defaultValue 'any'
     */
    runtime?: 'server' | 'edge' | 'any';
    /** Capabilities the plugin requests, each a typed `ctx` field. */
    needs?: PluginNeed;
}

/** @internal */
export type TransportOf<Opts extends PluginOptions> = undefined extends Opts['transport']
    ? 'any'
    : NonNullable<Opts['transport']>;

/** @internal */
export type RuntimeOf<Opts extends PluginOptions> = undefined extends Opts['runtime']
    ? 'any'
    : NonNullable<Opts['runtime']>;

/** @internal */
export type NeedsOf<Opts extends PluginOptions> = undefined extends Opts['needs'] ? never : NonNullable<Opts['needs']>;

/** @internal the transport a bot runs */
export type Transport = TypedExclude<NonNullable<PluginOptions['transport']>, 'any'>;

/** @internal the runtime a bot runs */
export type Runtime = TypedExclude<NonNullable<PluginOptions['runtime']>, 'any'>;

type TransportMismatch<PluginT extends string, BotT extends string> = Record<
    `this plugin declares transport '${PluginT}' but this bot runs '${BotT}'`,
    never
>;

type RuntimeMismatch<PluginRt extends string, BotRt extends string> = Record<
    `this plugin declares runtime '${PluginRt}' but this bot runs '${BotRt}'`,
    never
>;

type EdgePluginsUnsupported = Record<'an edge bot takes no plugins until edge support ships after v1', never>;

type BrandTransport<Plug> = Plug extends { readonly __transport?: infer T extends string } ? T : 'any';
type BrandRuntime<Plug> = Plug extends { readonly __runtime?: infer R extends string } ? R : 'any';

// `unknown` vanishes from the intersection at the attach parameter, and a mismatch object leaves
// the argument unassignable there.
/** @internal */
export type TransportAssert<Plug, BotT extends Transport> =
    BrandTransport<Plug> extends 'any' | BotT ? unknown : TransportMismatch<BrandTransport<Plug>, BotT>;

// keep `'edge' extends BotRt`. the flipped `BotRt extends 'edge'` distributes, and the 'server' arm
// gives `unknown`, which absorbs the edge arm and drops the gate on an un-narrowed host runtime.
/** @internal */
export type RuntimeAssert<Plug, BotRt extends Runtime> = 'edge' extends BotRt
    ? EdgePluginsUnsupported
    : BrandRuntime<Plug> extends 'any' | BotRt
      ? unknown
      : RuntimeMismatch<BrandRuntime<Plug>, BotRt>;
