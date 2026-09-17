import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import { getDevChannel } from '#hmr/devChannel';

import { RuntimeBrand, TransportBrand } from './brands';
import { resolveLifecycleSpec } from './lifecycle';

import type { CoreBase } from '#interfaces/CoreBase';
import type { ResolvedPluginLifecycleSpec, PluginLifecycleSpec } from './lifecycle';
import type { TransportOf, PluginOptions, RuntimeOf } from './options';
import type { Tail, FrameworkChannel, HmrAware, HmrUpdateEvent } from '@seedcord/types';

export interface Initializeable {
    init(): Promise<void>;
}

/** @internal */
const resolvedSpecSlot = Symbol('seedcord:plugin:spec');
/** @internal */
const loggerSlot = Symbol('seedcord:plugin:logger');

/**
 * Base class for a seedcord plugin. Extend it and implement `init()`. `this.core` is the running
 * bot.
 *
 * Your constructor takes the host first and passes it to `super()`. Add your own parameters after
 * it. `attach()` types them at the call site.
 *
 * @typeParam Opts - Where this plugin may attach, checked only at compile time.
 * @typeParam TCore - The `Core` each transport binds `this.core` to.
 *
 * @example
 * ```ts
 * class Analytics extends Plugin<{ transport: 'gateway' }> {
 *     constructor(
 *         host: CoreBase,
 *         private readonly apiKey: string
 *     ) {
 *         super(host, { init: { phase: StartupPhase.Login } });
 *     }
 *
 *     public async init(): Promise<void> {
 *         await this.connect(this.apiKey);
 *     }
 * }
 *
 * seedcord.attach('analytics', Analytics, apiKey);
 * ```
 */
export abstract class Plugin<Opts extends PluginOptions = {}, TCore extends CoreBase = CoreBase>
    implements Initializeable, HmrAware
{
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [TransportBrand]?: TransportOf<Opts>;
    /** @internal */
    declare readonly [RuntimeBrand]?: RuntimeOf<Opts>;

    /** @internal */
    readonly [resolvedSpecSlot]: ResolvedPluginLifecycleSpec;
    /** @internal */
    readonly [loggerSlot]: Logger;

    /** Logs under the plugin's class name, on the channel its attach key sets. */
    protected readonly logger: Logger;

    // CoreBase here keeps the augmented Core out of ConstructorParameters, which attach reads
    constructor(
        private readonly host: CoreBase,
        spec?: PluginLifecycleSpec
    ) {
        this.logger = new Logger(this.constructor.name);
        this[loggerSlot] = this.logger;
        this[resolvedSpecSlot] = resolveLifecycleSpec(spec, this.constructor.name);
    }

    /** The host, typed to the transport whose `Plugin` base this class extends. */
    protected get core(): TCore {
        // justified: each transport binds TCore to the Core its own host satisfies
        return this.host as TCore;
    }

    /**
     * Runs in `StartupPhase.Configuration` by default.
     * Move it to a different phase with the {@link PluginLifecycleSpec}.
     */
    abstract init(): Promise<void>;

    /**
     * Runs in the Ready phase, after every attached plugin's `init()` has resolved. The other Ready
     * tasks run alongside it, including the http server binding its port.
     *
     * Override it when your work needs a logged-in client or a resolved application id.
     */
    ready?(): Promise<void>;

    /**
     * Runs during teardown, in `ShutdownPhase.Disconnect` by default. seedcord skips it when `init()`
     * has thrown.
     *
     * When `init()` outlasts its timeout, seedcord calls this once that `init()` resolves, outside any
     * shutdown phase. The process must still be alive for that call to happen.
     */
    dispose?(): Promise<void>;

    /**
     * Throws a `SeedcordError` that contains the plugin class name and the reason.
     *
     * @param reason - Why the options are invalid.
     */
    protected rejectOptions(reason: string): never {
        throw new SeedcordError(SeedcordErrorCode.PluginOptionsRejected, [this.constructor.name, reason]);
    }

    /** Override to reload plugin state on an HMR update. */
    public onHmr(_event: HmrUpdateEvent): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Registers critical file patterns that should trigger a full restart when changed in Dev HMR.
     * @param patterns - Glob patterns relative to the project root
     */
    protected registerCriticalFiles(patterns: string[]): void {
        getDevChannel()?.send('seedcord:register-critical-files', { patterns });
    }
}

/** @internal */
export function resolvedLifecycleSpecOf(plugin: PluginLike): ResolvedPluginLifecycleSpec {
    return plugin[resolvedSpecSlot];
}

/** @internal */
export function pluginLoggerOf(plugin: PluginLike): Logger {
    return plugin[loggerSlot];
}

export type { PluginLifecycleSpec } from './lifecycle';
export type { PluginOptions } from './options';

// a bound of Plugin<{}> rejects every plugin that declares an option, since Plugin<A> and Plugin<B>
// are mutually unassignable. every member here must stay Opts-independent.
/** @internal */
export type PluginLike = Pick<
    Plugin,
    'init' | 'ready' | 'dispose' | 'onHmr' | typeof resolvedSpecSlot | typeof loggerSlot
>;

// a `CoreBase` first parameter rejects a narrowing ctor on its own, and it also collapses
// `InstanceType<Ctor>` to `PluginLike` at every attach call. CoreParamAssert checks it instead.
/** @internal */
export type PluginCtor<TPlugin extends PluginLike = PluginLike> = new (...args: any[]) => TPlugin;

/** @internal */
export type PluginArgs<Ctor extends PluginCtor> = Tail<ConstructorParameters<Ctor>>;

/** @internal */
export type Attached<Key extends string, Instance> = Key extends `${infer Group}.${infer Leaf}`
    ? Record<Group, Record<Leaf, Instance>>
    : Record<Key, Instance>;

// a group carries no PluginLike member, which is what tells it apart from an attached plugin
/** @internal */
export type AttachKeyAssert<Key extends string, Host> = Key extends `${infer Group}.${infer Leaf}`
    ? Leaf extends `${string}.${string}`
        ? `'${Key}' nests more than once. A plugin key takes one dot at most.`
        : Group extends FrameworkChannel
          ? `'${Group}' is a channel the framework logs on. Pick another group name.`
          : Group extends keyof Host
            ? Host[Group] extends PluginLike
                ? `'${Group}' already holds a plugin, so '${Leaf}' cannot nest inside it.`
                : Leaf extends keyof Host[Group]
                  ? `'${Key}' is already attached.`
                  : Key
            : Key
    : Key extends FrameworkChannel
      ? `'${Key}' is a channel the framework logs on. Pick another plugin key.`
      : Key extends keyof Host
        ? Host[Key] extends PluginLike
            ? `'${Key}' is already attached.`
            : `'${Key}' holds a group of plugins. Attach this one under a name of its own.`
        : Key;

type CoreParamTooNarrow = Record<
    'this plugin constructor must take CoreBase as its first parameter and read the transport Core off this.core',
    never
>;

// a narrowed first parameter fails `CoreBase extends Param`
/** @internal */
export type CoreParamAssert<Ctor extends PluginCtor> = CoreBase extends ConstructorParameters<Ctor>[0]
    ? unknown
    : CoreParamTooNarrow;
