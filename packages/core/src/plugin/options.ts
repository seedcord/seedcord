import type { RuntimeBrand, ScopedSpec, TransportBrand } from './brands';
import type { PluginLifecycleSpec } from './lifecycle';
import type { TypedExclude } from '@seedcord/types';

/**
 * Declares where a plugin may attach. Pass it as the `Plugin<Opts>` type argument. Every field you
 * narrow goes to `super()` as well. `attach()` fails to compile when the host does not match.
 *
 * @example
 * ```ts
 * // attaching this to an http bot fails to compile
 * class Voice extends Plugin<{ transport: 'gateway' }> {
 *     constructor(host: CoreBase) {
 *         super(host, { transport: 'gateway' });
 *     }
 *
 *     public async init(): Promise<void> {}
 * }
 * ```
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
export type Transport = TypedExclude<NonNullable<PluginOptions['transport']>, 'any'>;

/** @internal */
export type Runtime = TypedExclude<NonNullable<PluginOptions['runtime']>, 'any'>;

/** @internal */
export interface DeclaredScope {
    readonly transport: Transport | 'any';
    readonly runtime: Runtime | 'any';
}

/** @internal */
export type ScopeAxis = keyof DeclaredScope;

type NarrowedTransport<Opts extends PluginOptions> =
    TransportOf<Opts> extends 'any' ? unknown : { transport: TransportOf<Opts> };

type NarrowedRuntime<Opts extends PluginOptions> =
    RuntimeOf<Opts> extends 'any' ? unknown : { runtime: RuntimeOf<Opts> };

type ScopeToPass<Opts extends PluginOptions, Fixed extends ScopeAxis> = ('transport' extends Fixed
    ? unknown
    : NarrowedTransport<Opts>) &
    ('runtime' extends Fixed ? unknown : NarrowedRuntime<Opts>);

/** @internal */
export type PluginSpecArgs<Opts extends PluginOptions, Fixed extends ScopeAxis> =
    unknown extends ScopeToPass<Opts, Fixed>
        ? [spec?: PluginLifecycleSpec]
        : [spec: PluginLifecycleSpec & ScopeToPass<Opts, Fixed> & { readonly [ScopedSpec]?: never }];

type TransportMismatch<PluginT extends string, BotT extends string> = Record<
    `this plugin declares transport '${PluginT}' but this bot runs '${BotT}'`,
    never
>;

type RuntimeMismatch<PluginRt extends string, BotRt extends string> = Record<
    `this plugin declares runtime '${PluginRt}' but this bot runs '${BotRt}'`,
    never
>;

type BrandTransport<Plug> = Plug extends { readonly [TransportBrand]?: infer T extends string } ? T : 'any';
type BrandRuntime<Plug> = Plug extends { readonly [RuntimeBrand]?: infer R extends string } ? R : 'any';

/** @internal */
export type TransportAssert<Plug, BotT extends Transport> =
    BrandTransport<Plug> extends 'any' | BotT ? unknown : TransportMismatch<BrandTransport<Plug>, BotT>;

/** @internal */
export type RuntimeAssert<Plug, BotRt extends Runtime> =
    BrandRuntime<Plug> extends 'any' | BotRt ? unknown : RuntimeMismatch<BrandRuntime<Plug>, BotRt>;
