import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import { getDevChannel } from '@hmr/devChannel';

import { pluginContextSlot, readPluginContext } from './context';
import { resolveLifecycleSpec } from './lifecycle';

import type { PluginContext, StoredPluginContext } from './context';
import type { ResolvedPluginLifecycleSpec, PluginLifecycleSpec } from './lifecycle';
import type { TransportOf, NeedsOf, PluginOptions, RuntimeOf } from './options';
import type { CoreBase } from '@interfaces/CoreBase';
import type { Tail, HmrAware, HmrUpdateEvent } from '@seedcord/types';

export interface Initializeable {
    init(): Promise<void>;
}

/** @internal */
const resolvedSpecSlot = Symbol('seedcord.plugin.spec');

/**
 * Base class for Seedcord plugins. A subclass declares its options as the `Opts` type argument,
 * implements `init()`, and reads the framework surface through `this.ctx`.
 *
 * @typeParam Opts - The plugin's declared {@link PluginOptions}.
 * @typeParam TCore - The host type `this.core` resolves to. Each transport binds it to its own `Core`.
 */
export abstract class Plugin<Opts extends PluginOptions = {}, TCore extends CoreBase = CoreBase>
    implements Initializeable, HmrAware
{
    /** @internal phantom, never set at runtime */
    declare readonly __transport?: TransportOf<Opts>;
    /** @internal phantom, never set at runtime */
    declare readonly __runtime?: RuntimeOf<Opts>;

    /** @internal */
    readonly [resolvedSpecSlot]: ResolvedPluginLifecycleSpec;
    /** @internal */
    [pluginContextSlot]?: StoredPluginContext;

    /** Logs under the plugin's class name, on the channel its attach key names. */
    public readonly logger: Logger;

    // CoreBase here keeps the augmented Core out of ConstructorParameters, which attach reads
    constructor(
        private readonly host: CoreBase,
        spec?: PluginLifecycleSpec
    ) {
        this.logger = new Logger(this.constructor.name);
        this[resolvedSpecSlot] = resolveLifecycleSpec(spec, this.constructor.name);
    }

    /** The host, typed to the transport whose `Plugin` base this class extends. */
    protected get core(): TCore {
        // justified: each transport binds TCore to the Core its own host satisfies
        return this.host as TCore;
    }

    /** The framework surface, available from `init()` onward. Throws if read before `attach` finalizes it. */
    protected get ctx(): PluginContext<NeedsOf<Opts>> {
        return readPluginContext<NeedsOf<Opts>>(this);
    }

    abstract init(): Promise<void>;

    /**
     * Runs in the startup Ready phase, after `init()`. The gateway client is logged in by this phase,
     * and the http host runs its server-bind and health tasks in the same phase.
     */
    ready?(): Promise<void>;

    /** Runs during teardown, only when `init()` resolved. */
    dispose?(): Promise<void>;

    /**
     * Rejects the plugin's constructor options with a reason. Throws a `SeedcordError` naming the
     * plugin class and the reason.
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

export type { PluginContext, PluginCapabilityTypes } from './context';
export type { PluginLifecycleSpec } from './lifecycle';
export type { PluginOptions } from './options';

// a bound of Plugin<{}> rejects every plugin that declares an option, since Plugin<A> and Plugin<B>
// are mutually unassignable. every member here must stay Opts-independent.
/** @internal */
export type PluginLike = Pick<
    Plugin,
    'init' | 'ready' | 'dispose' | 'logger' | 'onHmr' | typeof resolvedSpecSlot | typeof pluginContextSlot
>;

// a `CoreBase` first parameter rejects a narrowing ctor on its own, and it also collapses
// `InstanceType<Ctor>` to `PluginLike` at every attach call. CoreParamAssert checks it instead.
/** @internal */
export type PluginCtor<TPlugin extends PluginLike = PluginLike> = new (...args: any[]) => TPlugin;

/** @internal */
export type PluginArgs<Ctor extends PluginCtor> = Tail<ConstructorParameters<Ctor>>;

type CoreParamTooNarrow = Record<
    'this plugin constructor must take CoreBase as its first parameter and read the transport Core off this.core',
    never
>;

// a narrowed first parameter fails `CoreBase extends Param`
/** @internal */
export type CoreParamAssert<Ctor extends PluginCtor> = CoreBase extends ConstructorParameters<Ctor>[0]
    ? unknown
    : CoreParamTooNarrow;

export { finalizePluginContext } from './context';
