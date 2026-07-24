import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { getDevChannel } from '@hmr/devChannel';

import { pluginContextSlot, readPluginContext } from './context';
import { resolveLifecycleSpec } from './lifecycle';

import type { PluginContext, StoredPluginContext } from './context';
import type { ResolvedPluginLifecycleSpec, PluginLifecycleSpec } from './lifecycle';
import type { TransportOf, NeedsOf, PluginOptions, RuntimeOf } from './options';
import type { CoreBase } from '@interfaces/CoreBase';
import type { Logger } from '@seedcord/logger';
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
 */
export abstract class Plugin<Opts extends PluginOptions = {}> implements Initializeable, HmrAware {
    /** @internal phantom, never set at runtime */
    declare readonly __transport?: TransportOf<Opts>;
    /** @internal phantom, never set at runtime */
    declare readonly __runtime?: RuntimeOf<Opts>;

    /** @internal */
    readonly [resolvedSpecSlot]: ResolvedPluginLifecycleSpec;
    /** @internal */
    [pluginContextSlot]?: StoredPluginContext;

    public abstract logger: Logger;

    // subclasses redeclare the transport's own Core type on their constructor
    constructor(
        protected pluggable: CoreBase,
        spec?: PluginLifecycleSpec
    ) {
        this[resolvedSpecSlot] = resolveLifecycleSpec(spec, this.constructor.name);
    }

    /** The framework surface, available from `init()` onward. Throws if read before `attach` finalizes it. */
    protected get ctx(): PluginContext<NeedsOf<Opts>> {
        return readPluginContext<NeedsOf<Opts>>(this);
    }

    abstract init(): Promise<void>;

    /** Runs after the bot is online (gateway logged in, or the http server listening). */
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
export function resolvedLifecycleSpecOf(plugin: Plugin): ResolvedPluginLifecycleSpec {
    return plugin[resolvedSpecSlot];
}

export type { PluginContext, PluginCapabilityTypes } from './context';
export type { PluginLifecycleSpec } from './lifecycle';
export type { PluginOptions } from './options';

/**
 * Constructor type for plugins that can accept extra arguments after Core.
 *
 * The first parameter stays untyped here. Subclasses declare their transport's own `Core`, and a
 * `CoreBase` parameter would reject them (construct-signature params check contravariantly). The
 * `Plugin` base constructor carries the real contract, and attach call sites still infer the
 * concrete subclass tuple for the trailing args.
 *
 * @internal
 */
export type PluginCtor<TPlugin extends Plugin = Plugin> = new (...args: any[]) => TPlugin;

/** @internal */
export type PluginArgs<Ctor extends PluginCtor> = Tail<ConstructorParameters<Ctor>>;

export { finalizePluginContext } from './context';
