import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { HostShutdown, HostStartup } from '@seedcord/types/internal';

import { assertDeclaredRuntime } from '#node/assertRuntimeVersion';
import { StartupPhase } from '#src/lifecycle/phases';
import { pluginLoggerOf, resolvedLifecycleSpecOf } from '#src/plugin/Plugin';
import { PluginHost } from '#src/plugin/PluginHost';

import { withTimeout } from './Lifecycle/withTimeout';
import { registerProcessErrors } from './processErrors';

import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import type { ShutdownPhase } from '#src/lifecycle/phases';
import type { Runtime, Transport } from '#src/plugin/options';
import type { Attachment } from '#src/plugin/PluginHost';

/**
 * Base class for a transport `Seedcord` class that runs as a long-lived node or bun process.
 *
 * You attach plugins while configuring the bot. Within one startup phase, their `init()` calls run
 * one after another in attach order.
 */
export abstract class ServerHost<BotT extends Transport, BotRt extends Runtime> extends PluginHost<BotT, BotRt> {
    /** @internal */
    readonly [HostShutdown]: CoordinatedShutdown;
    /** @internal */
    readonly [HostStartup]: CoordinatedStartup;

    /** Add a task that runs while the bot shuts down. */
    public readonly shutdown: Pick<CoordinatedShutdown, 'addTask'>;

    /** Add a task that runs while the bot starts. */
    public readonly startup: Pick<CoordinatedStartup, 'addTask'>;

    protected startFailed = false;

    private readonly pluginLogger = new Logger('Plugins', { channel: 'plugins' });

    private readonly completedInits = new Set<Attachment>();
    private readonly disposePhases = new Set<ShutdownPhase>();
    private pluginTasksRegistered = false;
    private initPromise?: Promise<this> | undefined;

    private static isInstantiated = false;
    private static liveHost?: object | undefined;
    private static liveShutdown?: CoordinatedShutdown | undefined;
    private static liveProcessErrors?: (() => void) | undefined;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        // a `sideEffects: false` build would drop the same call in the node entry
        assertDeclaredRuntime();
        super();

        if (ServerHost.isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        ServerHost.isInstantiated = true;
        ServerHost.liveHost = this;
        ServerHost.liveShutdown = shutdown;
        this[HostShutdown] = shutdown;
        this[HostStartup] = startup;
        // a getter returning the slot would expose run() and the signal handlers too
        this.shutdown = { addTask: shutdown.addTask.bind(shutdown) };
        this.startup = { addTask: startup.addTask.bind(startup) };
    }

    /** @internal */
    protected init(): Promise<this> {
        // clearing the slot on a rejection means a later retry throws its own error
        this.initPromise ??= this.runInit().catch((caught: unknown) => {
            this.initPromise = undefined;
            throw caught;
        });
        return this.initPromise;
    }

    private async runInit(): Promise<this> {
        if (this.isInitialized) return this;
        // a rerun after a failed startup would re-init the rolled-back plugins
        if (this.startFailed) throw new SeedcordError(SeedcordErrorCode.LifecycleRestartAfterFailure);

        this.registerPluginTasks();

        // codegen and the build construct the bot without starting it
        this[HostShutdown].registerSignalHandlers();
        if (this.config.errors?.catchProcessErrors ?? true) {
            ServerHost.liveProcessErrors = registerProcessErrors(this, this[HostShutdown]);
        }

        const startupSettled: PromiseWithResolvers<void> = Promise.withResolvers();
        this[HostShutdown].gateOnStartup(startupSettled.promise);

        try {
            await this[HostStartup].run();
        } catch (caught) {
            await this.rollback();
            throw caught;
        } finally {
            startupSettled.resolve();
        }

        this.isInitialized = true;
        return this;
    }

    /** @internal */
    protected static reset(host?: object): boolean {
        if (host !== undefined && ServerHost.liveHost !== host) return false;

        ServerHost.liveShutdown?.removeSignalHandlers();
        ServerHost.liveShutdown = undefined;
        ServerHost.liveProcessErrors?.();
        ServerHost.liveProcessErrors = undefined;
        ServerHost.liveHost = undefined;
        ServerHost.isInstantiated = false;
        return true;
    }

    // one combined task per phase keeps plugin inits sequential while the phase's other tasks run concurrently
    private registerPluginTasks(): void {
        if (this.pluginTasksRegistered) return;
        this.pluginTasksRegistered = true;

        const groups = Map.groupBy(
            this.attachments,
            (attachment) => resolvedLifecycleSpecOf(attachment.instance).init.phase
        );

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
            const running = instance.init();
            try {
                await withTimeout(`Plugin (${key})`, () => running, spec.init.timeout);
            } catch (caught) {
                if (isSeedcordError(caught, undefined, SeedcordErrorCode.LifecycleTaskTimeout)) {
                    this.disposeWhenInitResolves(attachment, running);
                }
                throw caught;
            }
            pluginLoggerOf(instance).utils.initialization(key, 'end');

            this.completedInits.add(attachment);
            if (instance.dispose) this.registerDisposeTask(spec.dispose.phase);
        }
    }

    // disposeCompleted skips a plugin missing from completedInits
    private disposeWhenInitResolves(attachment: Attachment, running: Promise<void>): void {
        const dispose = attachment.instance.dispose?.bind(attachment.instance);
        const spec = resolvedLifecycleSpecOf(attachment.instance);

        void running.then(
            async () => {
                if (!dispose) return;
                await withTimeout(`Plugin:${attachment.key}:dispose`, dispose, spec.dispose.timeout).catch(
                    (caught: unknown) =>
                        this.pluginLogger.warn(`${attachment.key} dispose failed after a timed-out init`, caught)
                );
            },
            (caught: unknown) => this.pluginLogger.warn(`${attachment.key} init failed after its timeout`, caught)
        );
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
        await this.disposeCompleted(phase, (caught) => failures.push(caught));
        throwSingleOrAggregate(failures, SeedcordErrorCode.PluginDisposeFailures);
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

// the public `shutdown` field carries addTask alone
export function shutdownOf(host: Pick<ServerHost<Transport, Runtime>, typeof HostShutdown>): CoordinatedShutdown {
    return host[HostShutdown];
}
