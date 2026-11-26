import { SeedcordErrorCode, isSeedcordError, paint } from '@seedcord/errors';
import { throwSingleOrAggregate } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { HostPlugins } from '@seedcord/types/internal';
import { sumBy } from 'es-toolkit';

import { StartupPhase } from '#src/lifecycle/phases';
import { HostHmr, rebuildAttachment, replaceAttachment } from '#src/plugin/PluginHost';
import { pluginLoggerOf } from '#src/plugin/pluginSlots';

import { withTimeout } from './withTimeout';

import type { HmrManager } from '#hmr/HmrManager';
import type { ShutdownTasks } from '#node/Lifecycle/CoordinatedShutdown';
import type { TaskShutdownPhase } from '#src/lifecycle/phases';
import type { Runtime, Transport } from '#src/plugin/options';
import type { PluginCtor } from '#src/plugin/Plugin';
import type { PluginHost } from '#src/plugin/PluginHost';
import type { Attachment } from '#src/plugin/PluginRegistry';
import type { StartupTasks } from './CoordinatedStartup';

type LifecycleHost = PluginHost<Transport, Runtime>;

export class PluginLifecycle {
    private readonly logger = new Logger('Plugins', { channel: 'plugins' });
    private readonly completedInits = new Set<Attachment>();
    private readonly disposePhases = new Set<TaskShutdownPhase>();
    private readonly timedOutInits = new Set<Promise<void>>();
    private registered = false;

    constructor(
        private readonly host: LifecycleHost,
        private readonly startup: StartupTasks,
        private readonly shutdown: ShutdownTasks
    ) {}

    private get attachments(): readonly Attachment[] {
        return this.host[HostPlugins].attachments;
    }

    // one combined task per phase keeps plugin inits sequential while the phase's other tasks run concurrently
    public register(): void {
        if (this.registered) return;
        this.registered = true;
        const hmr = this.host[HostHmr];
        if (hmr) for (const { instance } of this.attachments) hmr.register(instance);

        const groups = Map.groupBy(this.attachments, (attachment) => attachment.spec.init.phase);

        for (const [phase, group] of groups) {
            // Ready inits run in the combined Ready task before the ready hooks
            if (phase === StartupPhase.Ready) continue;
            const budget = group.reduce((sum, a) => sum + a.spec.init.timeout, 0);
            this.startup.addTask(phase, 'plugins-init', () => this.runInits(group), budget);
        }
        this.registerReadyTask(groups.get(StartupPhase.Ready) ?? [], hmr);
    }

    // the old plugin keeps running if this throws because nothing has changed yet
    public rebuild(old: Attachment, Plugin: PluginCtor): Attachment {
        return rebuildAttachment(this.host, old, Plugin);
    }

    public async replace(old: Attachment, next: Attachment): Promise<void> {
        replaceAttachment(this.host, old, next);
        await this.dispose(old).catch((caught: unknown) =>
            this.logger.warn(`${paint.sky.bold(old.key)} dispose failed before its reload`, caught)
        );
        this.completedInits.delete(old);
        await this.runInits([next]);
        await this.ready(next);
    }

    public async rollback(): Promise<void> {
        // log rollback dispose failures so they do not hide the startup error
        await this.disposeCompleted(undefined, (caught) => this.logger.warn('rollback dispose failed', caught));
        // prevents re-dispose when shutdown runs after rollback
        this.completedInits.clear();
    }

    public async timedOutInitsSettled(): Promise<void> {
        await Promise.allSettled(this.timedOutInits);
    }

    private async runInits(group: readonly Attachment[]): Promise<void> {
        for (const attachment of group) {
            const { key, instance, spec } = attachment;

            pluginLoggerOf(instance).utils.initialization(key, 'start');
            const running = instance.init();
            try {
                await withTimeout(`Plugin (${key})`, () => running, spec.init.timeout);
            } catch (caught) {
                if (isSeedcordError(caught, undefined, SeedcordErrorCode.LifecycleTaskTimeout)) {
                    this.disposeWhenInitResolves(attachment, Promise.resolve(running));
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
        const { key } = attachment;

        const settled = running.then(
            () =>
                this.dispose(attachment).catch((caught: unknown) =>
                    this.logger.warn(`${key} dispose failed after a timed-out init`, caught)
                ),
            (caught: unknown) => this.logger.warn(`${key} init failed after its timeout`, caught)
        );
        this.timedOutInits.add(settled);
        void settled.finally(() => this.timedOutInits.delete(settled));
    }

    private registerReadyTask(readyInits: readonly Attachment[], hmr: HmrManager | undefined): void {
        const withReady = this.attachments.filter(({ instance }) => instance.ready);
        if (readyInits.length === 0 && withReady.length === 0 && !hmr) return;
        const budget =
            sumBy(readyInits, ({ spec }) => spec.init.timeout) + sumBy(withReady, ({ spec }) => spec.ready.timeout);
        this.startup.addTask(
            StartupPhase.Ready,
            'plugins-ready',
            async () => {
                await this.runInits(readyInits);
                for (const attachment of withReady) await this.ready(attachment);
                hmr?.reloadPlugins({
                    attachments: () => this.attachments,
                    rebuild: (old, Plugin) => this.rebuild(old, Plugin),
                    replace: (old, next) => this.replace(old, next)
                });
            },
            budget
        );
    }

    private async ready({ key, instance, spec }: Attachment): Promise<void> {
        const ready = instance.ready?.bind(instance);
        if (ready) await withTimeout(`Plugin:${key}:ready`, ready, spec.ready.timeout);
    }

    private async dispose({ key, instance, spec }: Attachment): Promise<void> {
        const dispose = instance.dispose?.bind(instance);
        if (dispose) await withTimeout(`Plugin:${key}:dispose`, dispose, spec.dispose.timeout);
    }

    private registerDisposeTask(phase: TaskShutdownPhase): void {
        if (this.disposePhases.has(phase)) return;
        this.disposePhases.add(phase);

        // the budget covers every dispose in this phase because they all run in this one task
        const budget = this.attachments.reduce(
            (sum, a) => (a.instance.dispose && a.spec.dispose.phase === phase ? sum + a.spec.dispose.timeout : sum),
            0
        );
        this.shutdown.addTask(phase, 'plugins-dispose', () => this.runDisposals(phase), budget);
    }

    private async runDisposals(phase: TaskShutdownPhase): Promise<void> {
        const failures: unknown[] = [];
        await this.disposeCompleted(phase, (caught) => failures.push(caught));
        throwSingleOrAggregate(failures, SeedcordErrorCode.PluginDisposeFailures);
    }

    private async disposeCompleted(
        phase: TaskShutdownPhase | undefined,
        onError: (caught: unknown) => void
    ): Promise<void> {
        for (const attachment of [...this.attachments].reverse()) {
            if (!this.completedInits.has(attachment)) continue;
            if (phase !== undefined && attachment.spec.dispose.phase !== phase) continue;

            await this.dispose(attachment).catch(onError);
        }
    }
}
