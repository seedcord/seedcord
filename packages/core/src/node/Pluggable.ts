import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordAggregateError, SeedcordError } from '@seedcord/errors/internal';
import { FRAMEWORK_CHANNELS, Logger } from '@seedcord/logger';

import { assertNodeVersion } from '#node/assertNodeVersion';
import { StartupPhase } from '#src/lifecycle/phases';
import { pluginLoggerOf, resolvedLifecycleSpecOf } from '#src/plugin/Plugin';

import { withTimeout } from './Lifecycle/withTimeout';
import { registerProcessErrors } from './processErrors';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import type { ShutdownPhase } from '#src/lifecycle/phases';
import type { ChannelKeyAssert, Runtime, RuntimeAssert, Transport, TransportAssert } from '#src/plugin/options';
import type { CoreParamAssert, PluginArgs, PluginCtor, PluginLike } from '#src/plugin/Plugin';
import type { Bus } from '#subscribers/Bus';
import type { REST } from '@discordjs/rest';
import type { Config, IRateLimiter } from '@seedcord/types';

interface Attachment {
    readonly key: string;
    readonly instance: PluginLike;
}

const RESERVED_KEYS: ReadonlySet<string> = new Set(FRAMEWORK_CHANNELS);

/**
 * Base class for a plugin host, a transport `Seedcord` class.
 *
 * You attach plugins while configuring the bot. Within one startup phase, their `init()` calls run
 * one after another in attach order.
 */
// no defaults, a default runtime of the full union contains 'edge' and RuntimeAssert rejects every plugin on that
export abstract class Pluggable<BotT extends Transport, BotRt extends Runtime> implements CoreBase {
    public abstract readonly config: Config;
    public abstract readonly rest: REST;
    public abstract readonly applicationId: string;
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
    private static liveProcessErrors?: (() => void) | undefined;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        // a `sideEffects: false` build would drop the same call in the node entry
        assertNodeVersion(process.env.PACKAGE_NODE_RANGE ?? '', process.version);

        if (Pluggable.isInstantiated) {
            // signal handlers from the caller's shutdown stay on the process unless dropped here
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

        // two racing start() calls both reach here, since isInitialized is only set once startup settles
        const wantsProcessErrors = this.config.errors?.catchProcessErrors ?? true;
        if (wantsProcessErrors && !Pluggable.liveProcessErrors) {
            Pluggable.liveProcessErrors = registerProcessErrors(this, this.shutdown);
        }

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

    /** @internal codegen reads these to emit the `Core` augmentation */
    public get pluginKeys(): readonly string[] {
        return this.attachments.map((attachment) => attachment.key);
    }

    /** @internal so the next host can construct */
    protected static reset(): void {
        Pluggable.liveShutdown?.removeSignalHandlers();
        Pluggable.liveShutdown = undefined;
        Pluggable.liveProcessErrors?.();
        Pluggable.liveProcessErrors = undefined;
        Pluggable.isInstantiated = false;
    }

    /**
     * Attaches a plugin under `key`. Read the instance back as `core[key]`. `seedcord codegen`
     * writes the `Core` augmentation that types it there.
     *
     * Startup runs each plugin's `init()` in attach order within its phase.
     *
     * Attaching a plugin whose `transport` or `runtime` differs from this host fails to compile.
     * Your constructor takes `CoreBase` as its first parameter (you don't need to pass it though).
     * A narrower one fails to compile here.
     *
     * @param key - Also the channel the plugin logs on. Reserved channel names throw.
     * @param args - Whatever your constructor takes after the host.
     * @throws A **SeedcordError** if you attach after the bot has started. A taken or reserved key throws too.
     * @example
     * ```ts
     * seedcord.attach('db', Mongoose, { uri: 'mongodb://...', name: 'seedcord', dir: ... });
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
        // several reserved channels are also members on a host, which the next check would report first
        if (RESERVED_KEYS.has(key)) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginReservedChannel, [key]);
        }
        if (key in this) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, [key]);
        }

        const instance = new Plugin(this, ...args);
        pluginLoggerOf(instance).setChannel(key);
        this.plugins.push(instance);
        this.attachments.push({ key, instance });

        return Object.assign(this, { [key]: instance } as Record<Key, InstanceType<Ctor>>);
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
            this.startup.addTask(phase, 'plugins-init', () => this.runInits(group), budget);
        }

        this.registerReadyTask(groups.get(StartupPhase.Ready) ?? []);
    }

    private async runInits(group: readonly Attachment[]): Promise<void> {
        for (const attachment of group) {
            const { key, instance } = attachment;
            const spec = resolvedLifecycleSpecOf(instance);

            pluginLoggerOf(instance).utils.initialization(key, 'start');
            await withTimeout(`Plugin (${key})`, () => instance.init(), spec.init.timeout);
            pluginLoggerOf(instance).utils.initialization(key, 'end');

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
            'plugins-ready',
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

        // the budget covers every dispose in this phase because they all run in this one task
        const budget = this.attachments.reduce((sum, a) => {
            const spec = resolvedLifecycleSpecOf(a.instance);
            return a.instance.dispose && spec.dispose.phase === phase ? sum + spec.dispose.timeout : sum;
        }, 0);
        this.shutdown.addTask(phase, 'plugins-dispose', () => this.runDisposals(phase), budget);
    }

    private async runDisposals(phase: ShutdownPhase): Promise<void> {
        const failures: unknown[] = [];
        // keep disposing the rest even when one fails
        await this.disposeCompleted(phase, (caught) => failures.push(caught));
        if (failures.length === 1) throw failures[0];
        if (failures.length > 1) {
            throw new SeedcordAggregateError(SeedcordErrorCode.PluginDisposeFailures, failures, [failures.length]);
        }
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
