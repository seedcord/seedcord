import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { TypedEventEmitter } from '@seedcord/event-emitter';

import { StartupPhase } from '@src/lifecycle/phases';

import type { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import type { EventMap, NoEvents } from '@seedcord/event-emitter';
import type { PluginArgs, PluginCtor, Plugin } from '@src/plugin/Plugin';

/**
 * Base class for objects that can have plugins attached.
 *
 * Provides plugin attachment capabilities and lifecycle management. Plugins are attached during
 * configuration and initialized during startup. Not constructed directly, the host is a transport
 * `Seedcord` class.
 */
export class Pluggable<
    TPluggableEvents extends EventMap<TPluggableEvents> = NoEvents
> extends TypedEventEmitter<TPluggableEvents> {
    protected isInitialized = false;
    protected readonly shutdown: CoordinatedShutdown;
    protected readonly startup: CoordinatedStartup;
    protected readonly plugins: Plugin[] = [];

    private static isInstantiated = false;
    private static liveShutdown?: CoordinatedShutdown | undefined;

    private static readonly PLUGIN_INIT_TIMEOUT_MS = 15_000;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        if (Pluggable.isInstantiated) {
            // the caller constructed this shutdown, release its fresh handler pair before rejecting
            shutdown.removeSignalHandlers();
            throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        }

        super();
        Pluggable.isInstantiated = true;
        Pluggable.liveShutdown = shutdown;
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

    /** @internal releases the signal handlers and clears the singleton so the next host can construct */
    protected static reset(): void {
        Pluggable.liveShutdown?.removeSignalHandlers();
        Pluggable.liveShutdown = undefined;
        Pluggable.isInstantiated = false;
    }

    /**
     * Attaches a plugin to this instance
     *
     * Plugins provide external functionality and are initialized during startup.
     * The plugin instance becomes available as a property in `core` wherever it's available.
     *
     * Make sure to augment the transport's `Core` interface with the plugin type to ensure
     * TypeScript recognizes it and provides intellisense.
     *
     * @typeParam Key - The property name for accessing the plugin
     * @typeParam Ctor - The plugin constructor type
     * @param key - Property name to access the plugin instance
     * @param Plugin - Plugin constructor class
     * @param args - Additional arguments to pass to the plugin constructor
     * @returns This instance with the plugin attached as a typed property
     * @throws A **SeedcordError** When called after initialization or if key already exists
     * @example
     * ```typescript
     * seedcord.attach('db', Mongo, { uri: 'mongodb://...', name: 'seedcord', dir: ... })
     * ```
     */
    public attach<Key extends string, Ctor extends PluginCtor>(
        this: this,
        key: Key,
        Plugin: Ctor,
        ...args: PluginArgs<Ctor>
    ): this & Record<Key, InstanceType<Ctor>> {
        if (this.isInitialized) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginAfterInit);
        }
        if (key in this) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, [key]);
        }

        const instance = new Plugin(this, ...args);
        this.plugins.push(instance);

        const entry = {
            [key]: instance
        } as Record<Key, InstanceType<Ctor>>;

        this.startup.addTask(
            // TEMP until the lifecycle rework remaps phases. Configuration precedes Instantiation, where the bot logs in
            StartupPhase.Configuration,
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
