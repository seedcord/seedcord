import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { FRAMEWORK_CHANNELS, Logger } from '@seedcord/logger';

import { StartupPhase } from '@src/lifecycle/phases';
import { finalizePluginContext } from '@src/plugin/context';
import { resolvedLifecycleSpecOf } from '@src/plugin/Plugin';

import { withTimeout } from './Lifecycle/withTimeout';

import type { CoreBase } from '@interfaces/CoreBase';
import type { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import type { Config, IRateLimiter, Store } from '@seedcord/types';
import type { ShutdownPhase } from '@src/lifecycle/phases';
import type { PluginCapabilities, PluginContext, StoredPluginContext } from '@src/plugin/context';
import type { ChannelKeyAssert, Runtime, RuntimeAssert, Transport, TransportAssert } from '@src/plugin/options';
import type { CoreParamAssert, PluginArgs, PluginCtor, PluginLike } from '@src/plugin/Plugin';
import type { Bus } from '@subscribers/Bus';

interface Attachment {
    readonly key: string;
    readonly instance: PluginLike;
}

const RESERVED_KEYS: ReadonlySet<string> = new Set(FRAMEWORK_CHANNELS);

/**
 * Base class for objects that can have plugins attached.
 *
 * Plugins are attached during configuration and initialized during startup, sequentially in attach
 * order within each phase. Not constructed directly, the host is a transport `Seedcord` class.
 */
// no defaults, a default runtime of the full union contains 'edge' and RuntimeAssert rejects every plugin on that
export abstract class Pluggable<BotT extends Transport, BotRt extends Runtime> implements CoreBase {
    public abstract readonly config: Config;
    public abstract readonly rateLimiter: IRateLimiter;
    public abstract readonly bus: Bus;

    /** @see {@link CoordinatedShutdown} */
    public readonly shutdown: CoordinatedShutdown;

    /** @see {@link CoordinatedStartup} */
    public readonly startup: CoordinatedStartup;

    protected isInitialized = false;
    protected startFailed = false;
    protected readonly plugins: PluginLike[] = [];

    private readonly pluginLogger = new Logger('Plugins', { channel: 'plugins' });

    private readonly attachments: Attachment[] = [];
    private readonly completedInits = new Set<Attachment>();
    private readonly disposePhases = new Set<ShutdownPhase>();
    private pluginTasksRegistered = false;

    private static isInstantiated = false;
    private static liveShutdown?: CoordinatedShutdown | undefined;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        if (Pluggable.isInstantiated) {
            // the caller constructed this shutdown, its signal handlers leak unless dropped here
            shutdown.removeSignalHandlers();
            throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        }

        Pluggable.isInstantiated = true;
        Pluggable.liveShutdown = shutdown;
        this.shutdown = shutdown;
        this.startup = startup;
    }

    /** @internal */
    protected async init(): Promise<this> {
        if (this.isInitialized) return this;
        // a rerun after a failed startup would re-init the rolled-back plugins
        if (this.startFailed) throw new SeedcordError(SeedcordErrorCode.LifecycleRestartAfterFailure);

        this.registerPluginTasks();

        const startupSettled: PromiseWithResolvers<void> = Promise.withResolvers();
        this.shutdown.gateOnStartup(startupSettled.promise);

        try {
            await this.startup.run();
        } catch (caught) {
            await this.rollback();
            throw caught;
        } finally {
            startupSettled.resolve();
        }

        this.isInitialized = true;
        return this;
    }

    // transports override to inject client/token/rest
    protected pluginCapabilities(): PluginCapabilities {
        return {};
    }

    protected pluginStore(): Store<'charge'> {
        // justified: both assignment branches of rateLimiter are Store<'charge'> at the hosts
        return this.config.store ?? (this.rateLimiter as Store<'charge'>);
    }

    /** @internal codegen reads these to emit the `Core` augmentation */
    public get pluginKeys(): readonly string[] {
        return this.attachments.map((attachment) => attachment.key);
    }

    /** @internal releases the signal handlers and clears the singleton so the next host can construct */
    protected static reset(): void {
        Pluggable.liveShutdown?.removeSignalHandlers();
        Pluggable.liveShutdown = undefined;
        Pluggable.isInstantiated = false;
    }

    /**
     * Attaches a plugin to this instance.
     *
     * The plugin initializes during startup, after every plugin attached before it, and becomes
     * available as a property on `core`. `seedcord codegen` writes the `Core` augmentation that
     * types it.
     *
     * A plugin declaring a `transport` or `runtime` this host does not run is a compile error on
     * this call. An edge host takes no plugins at all. A plugin constructor narrowing its first
     * parameter past `CoreBase` is a compile error here too. Read the transport `Core` off `this.core`.
     *
     * @typeParam Key - The property name for accessing the plugin
     * @typeParam Ctor - The plugin constructor type
     * @param key - Property name to access the plugin instance
     * @param Plugin - Plugin constructor class
     * @param args - Additional arguments to pass to the plugin constructor
     * @returns This instance with the plugin attached as a typed property
     * @throws A **SeedcordError** When called after initialization or if key already exists or is reserved
     * @example
     * ```typescript
     * seedcord.attach('db', Mongoose, { uri: 'mongodb://...', name: 'seedcord', dir: ... })
     * ```
     */
    public attach<Key extends string, Ctor extends PluginCtor>(
        this: this,
        key: ChannelKeyAssert<Key>,
        Plugin: Ctor &
            TransportAssert<InstanceType<Ctor>, BotT> &
            RuntimeAssert<InstanceType<Ctor>, BotRt> &
            CoreParamAssert<Ctor>,
        ...args: PluginArgs<Ctor>
    ): this & Record<Key, InstanceType<Ctor>> {
        if (this.isInitialized) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginAfterInit);
        }
        if (key in this) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, [key]);
        }
        if (RESERVED_KEYS.has(key)) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginReservedChannel, [key]);
        }

        const instance = new Plugin(this, ...args);
        this.plugins.push(instance);
        this.attachments.push({ key, instance });
        this.finalizeContext(key, instance);

        return Object.assign(this, { [key]: instance } as Record<Key, InstanceType<Ctor>>);
    }

    private finalizeContext(key: string, instance: PluginLike): void {
        const caps = this.pluginCapabilities();
        const readToken = (): string | undefined => this.pluginCapabilities().token;
        const ctx: StoredPluginContext = {
            logger: new Logger(key),
            config: this.config,
            store: this.pluginStore(),
            client: caps.client,
            // http sets the token during Ready, read it live
            get token(): string | undefined {
                return readToken();
            },
            rest: caps.rest
        };
        finalizePluginContext(instance, ctx as PluginContext);
    }

    // one combined task per phase keeps plugin inits sequential while the phase's other tasks run concurrently
    private registerPluginTasks(): void {
        if (this.pluginTasksRegistered) return;
        this.pluginTasksRegistered = true;

        const groups = new Map<StartupPhase, Attachment[]>();
        for (const attachment of this.attachments) {
            const phase = resolvedLifecycleSpecOf(attachment.instance).init.phase;
            const group = groups.get(phase) ?? [];
            group.push(attachment);
            groups.set(phase, group);
        }

        for (const [phase, group] of groups) {
            // Ready inits run in the combined Ready task, before the ready hooks
            if (phase === StartupPhase.Ready) continue;
            const budget = group.reduce((sum, a) => sum + resolvedLifecycleSpecOf(a.instance).init.timeout, 0);
            this.startup.addTask(phase, 'Plugins:init', () => this.runInits(group), budget);
        }

        this.registerReadyTask(groups.get(StartupPhase.Ready) ?? []);
    }

    private async runInits(group: readonly Attachment[]): Promise<void> {
        for (const attachment of group) {
            const { key, instance } = attachment;
            const spec = resolvedLifecycleSpecOf(instance);

            instance.logger.utils.initialization(key, 'start');
            await withTimeout(`Plugin:${key}`, () => instance.init(), spec.init.timeout);
            instance.logger.utils.initialization(key, 'end');

            this.completedInits.add(attachment);
            if (instance.dispose) this.registerDisposeTask(spec.dispose.phase);
        }
    }

    private registerReadyTask(readyInits: readonly Attachment[]): void {
        const steps = this.attachments.reduce<{ key: string; run: () => Promise<void>; timeout: number }[]>(
            (acc, a) => {
                const ready = a.instance.ready?.bind(a.instance);
                if (ready) {
                    acc.push({
                        key: a.key,
                        run: ready,
                        timeout: resolvedLifecycleSpecOf(a.instance).ready.timeout
                    });
                }
                return acc;
            },
            []
        );
        if (readyInits.length === 0 && steps.length === 0) return;

        const budget =
            readyInits.reduce((sum, a) => sum + resolvedLifecycleSpecOf(a.instance).init.timeout, 0) +
            steps.reduce((sum, step) => sum + step.timeout, 0);
        this.startup.addTask(
            StartupPhase.Ready,
            'Plugins',
            async () => {
                await this.runInits(readyInits);
                for (const step of steps) {
                    await withTimeout(`Plugin:${step.key}:ready`, step.run, step.timeout);
                }
            },
            budget
        );
    }

    private registerDisposeTask(phase: ShutdownPhase): void {
        if (this.disposePhases.has(phase)) return;
        this.disposePhases.add(phase);

        // registered once per phase, later inits of that phase run in the same task
        const budget = this.attachments.reduce((sum, a) => {
            const spec = resolvedLifecycleSpecOf(a.instance);
            return a.instance.dispose && spec.dispose.phase === phase ? sum + spec.dispose.timeout : sum;
        }, 0);
        this.shutdown.addTask(phase, 'Plugins:dispose', () => this.runDisposals(phase), budget);
    }

    private async runDisposals(phase: ShutdownPhase): Promise<void> {
        const failures: unknown[] = [];
        // keep disposing the rest even when one fails
        await this.disposeCompleted(phase, (caught) => failures.push(caught));
        if (failures.length === 1) throw failures[0];
        if (failures.length > 1) throw new AggregateError(failures, 'plugin dispose failures');
    }

    private async disposeCompleted(
        phase: ShutdownPhase | undefined,
        onError: (caught: unknown) => void
    ): Promise<void> {
        for (const attachment of [...this.attachments].reverse()) {
            if (!this.completedInits.has(attachment)) continue;
            const dispose = attachment.instance.dispose?.bind(attachment.instance);
            if (!dispose) continue;
            const spec = resolvedLifecycleSpecOf(attachment.instance);
            if (phase !== undefined && spec.dispose.phase !== phase) continue;

            try {
                await withTimeout(`Plugin:${attachment.key}:dispose`, dispose, spec.dispose.timeout);
            } catch (caught) {
                onError(caught);
            }
        }
    }

    private async rollback(): Promise<void> {
        this.startFailed = true;
        // log rollback dispose failures so they do not hide the startup error
        await this.disposeCompleted(undefined, (caught) => this.pluginLogger.warn('rollback dispose failed', caught));
        // prevents re-dispose when shutdown runs after rollback
        this.completedInits.clear();
    }
}
