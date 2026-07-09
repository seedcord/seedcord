import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';

import { getDevChannel } from '@hmr/devChannel';

import type { Core } from './Core';
import type { EventMap, NoEvents } from '@seedcord/event-emitter';
import type { Logger } from '@seedcord/logger';
import type { CoordinatedShutdown, CoordinatedStartup, StartupPhase } from '@seedcord/services';
import type { Tail } from '@seedcord/types';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types/internal';

/** Interface for objects that can be initialized asynchronously */
export interface Initializeable {
    init(): Promise<void>;
}

/**
 * Base class for Seedcord plugins
 *
 * Extend this class to create plugins that integrate with the Seedcord lifecycle.
 * Plugins have access to the core instance and must implement initialization logic.
 */
export abstract class Plugin<TPluginEvents extends EventMap<TPluginEvents> = NoEvents>
    extends TypedEventEmitter<TPluginEvents>
    implements Initializeable, HmrAware
{
    /** Logger instance for this plugin. */
    public abstract logger: Logger;

    public name: string = this.constructor.name;

    constructor(protected pluggable: Core) {
        super();
    }

    /**
     * Initialize the plugin.
     * @virtual
     */
    abstract init(): Promise<void>;

    /**
     * Reloads plugin state on an HMR update. The base implementation is a no-op, override it in your plugin.
     * @virtual
     */
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

    /** @internal */
    override removeListener<TEventKey extends Extract<keyof TPluginEvents, string | symbol>>(
        event: TEventKey,
        listener: (...args: TPluginEvents[TEventKey]) => void
    ): this {
        return super.removeListener(event, listener);
    }

    /** @internal */
    override removeAllListeners(event?: Extract<keyof TPluginEvents, string | symbol>): this {
        return super.removeAllListeners(event);
    }
}

/**
 * Constructor type for plugins that can accept additional arguments after Core
 * @typeParam TPlugin - The plugin type being constructed
 *
 * @internal
 */
export type PluginCtor<TPlugin extends Plugin = Plugin> = new (core: Core, ...args: any[]) => TPlugin;

/**
 * Extracts the argument types for a plugin constructor (excluding the Core parameter)
 * @typeParam Ctor - The plugin constructor to extract arguments from
 *
 * @internal
 */
export type PluginArgs<Ctor extends PluginCtor> = Tail<ConstructorParameters<Ctor>>;

/**
 * Base class for objects that can have plugins attached.
 *
 * Provides plugin attachment capabilities and lifecycle management. Plugins are attached during
 * configuration and initialized during startup. Not constructed directly, the host is a {@link Seedcord}.
 */
export class Pluggable<
    TPluggableEvents extends EventMap<TPluggableEvents> = NoEvents
> extends TypedEventEmitter<TPluggableEvents> {
    protected isInitialized = false;
    protected readonly shutdown: CoordinatedShutdown;
    protected readonly startup: CoordinatedStartup;
    protected readonly plugins: Plugin[] = [];

    private static readonly PLUGIN_INIT_TIMEOUT_MS = 15_000;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        super();
        this.shutdown = shutdown;
        this.startup = startup;
    }

    /** @internal */
    protected async init(): Promise<this> {
        if (this.isInitialized) return this;

        await this.startup.run();
        this.isInitialized = true;

        return this;
    }

    /**
     * Attaches a plugin to this instance
     *
     * Plugins provide external functionality and are initialized during the specified startup phase.
     * The plugin instance becomes available as a property in `core` wherever it's available.
     *
     * Make sure to augment the {@link Core} interface with the plugin type to ensure TypeScript recognizes it and provides intellisense.
     *
     * @typeParam Key - The property name for accessing the plugin
     * @typeParam Ctor - The plugin constructor type
     * @param key - Property name to access the plugin instance
     * @param Plugin - Plugin constructor class
     * @param startupPhase - When during startup to initialize this plugin ({@link StartupPhase})
     * @param args - Additional arguments to pass to the plugin constructor
     * @returns This instance with the plugin attached as a typed property
     * @throws A **SeedcordError** When called after initialization or if key already exists
     * @example
     * ```typescript
     * seedcord.attach('db', Mongo, StartupPhase.Configuration, { uri: 'mongodb://...', name: 'seedcord', dir: ... })
     * ```
     */
    public attach<Key extends string, Ctor extends PluginCtor>(
        this: this,
        key: Key,
        Plugin: Ctor,
        startupPhase: StartupPhase,
        ...args: PluginArgs<Ctor>
    ): this & Record<Key, InstanceType<Ctor>> {
        if (this.isInitialized) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginAfterInit);
        }
        if (key in this) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, [key]);
        }

        // `Core` is augmented by consumer declaration merging, so `this` only satisfies the augmented type
        // after every plugin attaches, which is what attach() does. The host is always a Core at runtime.
        // eslint-disable-next-line no-restricted-syntax -- forced by the declaration-merging note above
        const instance = new Plugin(this as unknown as Core, ...args);
        this.plugins.push(instance);

        const entry = {
            [key]: instance
        } as Record<Key, InstanceType<Ctor>>;

        this.startup.addTask(
            startupPhase,
            `Plugin:${key}`,
            async () => {
                instance.logger.utils.initialization(key, 'start');
                await instance.init();
                instance.logger.utils.initialization(key, 'end');
            },
            Pluggable.PLUGIN_INIT_TIMEOUT_MS
        );

        return Object.assign(this, entry);
    }

    /** @internal */
    override removeListener<TEventKey extends Extract<keyof TPluggableEvents, string | symbol>>(
        event: TEventKey,
        listener: (...args: TPluggableEvents[TEventKey]) => void
    ): this {
        return super.removeListener(event, listener);
    }

    /** @internal */
    override removeAllListeners(event?: Extract<keyof TPluggableEvents, string | symbol>): this {
        return super.removeAllListeners(event);
    }
}
