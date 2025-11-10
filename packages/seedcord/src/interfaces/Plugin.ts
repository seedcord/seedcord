import { SeedcordError, SeedcordErrorCode, StrictEventEmitter } from '@seedcord/services';
import chalk from 'chalk';

import type { Core } from './Core';
import type {
    SENoEvents,
    CoordinatedShutdown,
    CoordinatedStartup,
    Logger,
    StartupPhase,
    SEEventMapLike
} from '@seedcord/services';
import type { Tail } from '@seedcord/types';

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
export abstract class Plugin<TPluginEvents extends SEEventMapLike<TPluginEvents> = SENoEvents>
    extends StrictEventEmitter<TPluginEvents>
    implements Initializeable
{
    /** Logger instance for this plugin - must be implemented by subclasses */
    public abstract logger: Logger;

    constructor(protected pluggable: Core) {
        super();
    }

    /**
     * Initialize the plugin - implement setup logic here
     * @virtual Override this method in your plugin classes
     */
    abstract init(): Promise<void>;
}

/**
 * Constructor type for plugins that can accept additional arguments after Core
 * @typeParam TPlugin - The plugin type being constructed
 */
export type PluginCtor<TPlugin extends Plugin = Plugin> = new (core: Core, ...args: any[]) => TPlugin;

/**
 * Extracts the argument types for a plugin constructor (excluding the Core parameter)
 * @typeParam Ctor - The plugin constructor to extract arguments from
 */
export type PluginArgs<Ctor extends PluginCtor> = Tail<ConstructorParameters<Ctor>>;

/**
 * Base class for objects that can have plugins attached
 *
 * Provides plugin attachment capabilities and lifecycle management.
 * Plugins are attached during configuration and initialized during startup.
 */
export class Pluggable<
    TPluggableEvents extends SEEventMapLike<TPluggableEvents> = SENoEvents
> extends StrictEventEmitter<TPluggableEvents> {
    protected isInitialized = false;
    protected readonly shutdown: CoordinatedShutdown;
    protected readonly startup: CoordinatedStartup;

    private static readonly PLUGIN_INIT_TIMEOUT_MS = 15000;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        super();
        this.shutdown = shutdown;
        this.startup = startup;
    }

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
     * @throws A {@link SeedcordError} When called after initialization or if key already exists
     * @example
     * ```typescript
     * seedcord.attach('db', Mongo, StartupPhase.Configuration, { uri: 'mongodb://...', name: 'seedcord', dir: ... })
     * ```
     */
    public attach<Key extends string, Ctor extends PluginCtor>(
        this: this,
        key: Key,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Plugin: Ctor,
        startupPhase: StartupPhase,
        ...args: PluginArgs<Ctor>
    ): this & Record<Key, InstanceType<Ctor>> {
        if (this.isInitialized) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginAfterInit);
        }
        if ((this as Record<string, unknown>)[key]) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, [key]);
        }

        const instance = new Plugin(this as unknown as Core, ...args);

        const entry = {
            [key]: instance
        } as Record<Key, InstanceType<Ctor>>;

        this.startup.addTask(
            startupPhase,
            `Plugin:${key}`,
            async () => {
                instance.logger.info(chalk.bold('Initializing'));
                await instance.init();
                instance.logger.info(chalk.bold('Initialized'));
            },
            Pluggable.PLUGIN_INIT_TIMEOUT_MS
        );

        return Object.assign(this, entry);
    }
}
