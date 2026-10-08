import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { throwSingleOrAggregate } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import { StartupPhase } from '#src/lifecycle/phases';
import { pluginLoggerOf } from '#src/plugin/Plugin';

import { withTimeout } from './withTimeout';

import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import type { ShutdownPhase } from '#src/lifecycle/phases';
import type { Attachment } from '#src/plugin/PluginHost';
import type { CoordinatedStartup } from './CoordinatedStartup';

interface ReadyStep {
    readonly key: string;
    readonly run: () => Promise<void>;
    readonly timeout: number;
}

export class PluginLifecycle {
    readonly #logger = new Logger('Plugins', { channel: 'plugins' });
    readonly #completedInits = new Set<Attachment>();
    readonly #disposePhases = new Set<ShutdownPhase>();
    readonly #timedOutInits = new Set<Promise<void>>();
    readonly #startup: Pick<CoordinatedStartup, 'addTask'>;
    readonly #shutdown: Pick<CoordinatedShutdown, 'addTask'>;
    #attachments: readonly Attachment[] = [];
    #registered = false;

    constructor(startup: Pick<CoordinatedStartup, 'addTask'>, shutdown: Pick<CoordinatedShutdown, 'addTask'>) {
        this.#startup = startup;
        this.#shutdown = shutdown;
    }

    // one combined task per phase keeps plugin inits sequential while the phase's other tasks run concurrently
    public register(attachments: readonly Attachment[]): void {
        if (this.#registered) return;
        this.#registered = true;
        this.#attachments = [...attachments];

        const groups = Map.groupBy(this.#attachments, (attachment) => attachment.spec.init.phase);

        for (const [phase, group] of groups) {
            // Ready inits run in the combined Ready task, before the ready hooks
            if (phase === StartupPhase.Ready) continue;
            const budget = group.reduce((sum, a) => sum + a.spec.init.timeout, 0);
            this.#startup.addTask(phase, 'plugins-init', () => this.#runInits(group), budget);
        }

        this.#registerReadyTask(groups.get(StartupPhase.Ready) ?? []);
    }

    public async rollback(): Promise<void> {
        // log rollback dispose failures so they do not hide the startup error
        await this.#disposeCompleted(undefined, (caught) => this.#logger.warn('rollback dispose failed', caught));
        // prevents re-dispose when shutdown runs after rollback
        this.#completedInits.clear();
    }

    public afterTimedOutInits(run: () => void): void {
        if (this.#timedOutInits.size === 0) {
            run();
            return;
        }
        void Promise.allSettled(this.#timedOutInits).then(run);
    }

    async #runInits(group: readonly Attachment[]): Promise<void> {
        for (const attachment of group) {
            const { key, instance, spec } = attachment;

            pluginLoggerOf(instance).utils.initialization(key, 'start');
            const running = instance.init();
            try {
                await withTimeout(`Plugin (${key})`, () => running, spec.init.timeout);
            } catch (caught) {
                if (isSeedcordError(caught, undefined, SeedcordErrorCode.LifecycleTaskTimeout)) {
                    this.#disposeWhenInitResolves(attachment, running);
                }
                throw caught;
            }
            pluginLoggerOf(instance).utils.initialization(key, 'end');

            this.#completedInits.add(attachment);
            if (instance.dispose) this.#registerDisposeTask(spec.dispose.phase);
        }
    }

    // disposeCompleted skips a plugin missing from completedInits
    #disposeWhenInitResolves({ key, instance, spec }: Attachment, running: Promise<void>): void {
        const dispose = instance.dispose?.bind(instance);

        const settled = running.then(
            async () => {
                if (!dispose) return;
                await withTimeout(`Plugin:${key}:dispose`, dispose, spec.dispose.timeout).catch((caught: unknown) =>
                    this.#logger.warn(`${key} dispose failed after a timed-out init`, caught)
                );
            },
            (caught: unknown) => this.#logger.warn(`${key} init failed after its timeout`, caught)
        );
        this.#timedOutInits.add(settled);
        void settled.finally(() => this.#timedOutInits.delete(settled));
    }

    #registerReadyTask(readyInits: readonly Attachment[]): void {
        const steps = this.#attachments.reduce<ReadyStep[]>((acc, { key, instance, spec }) => {
            const ready = instance.ready?.bind(instance);
            if (ready) acc.push({ key, run: ready, timeout: spec.ready.timeout });
            return acc;
        }, []);
        if (readyInits.length === 0 && steps.length === 0) return;

        const budget =
            readyInits.reduce((sum, a) => sum + a.spec.init.timeout, 0) +
            steps.reduce((sum, step) => sum + step.timeout, 0);
        this.#startup.addTask(
            StartupPhase.Ready,
            'plugins-ready',
            async () => {
                await this.#runInits(readyInits);
                for (const step of steps) {
                    await withTimeout(`Plugin:${step.key}:ready`, step.run, step.timeout);
                }
            },
            budget
        );
    }

    #registerDisposeTask(phase: ShutdownPhase): void {
        if (this.#disposePhases.has(phase)) return;
        this.#disposePhases.add(phase);

        // the budget covers every dispose in this phase because they all run in this one task
        const budget = this.#attachments.reduce(
            (sum, a) => (a.instance.dispose && a.spec.dispose.phase === phase ? sum + a.spec.dispose.timeout : sum),
            0
        );
        this.#shutdown.addTask(phase, 'plugins-dispose', () => this.#runDisposals(phase), budget);
    }

    async #runDisposals(phase: ShutdownPhase): Promise<void> {
        const failures: unknown[] = [];
        await this.#disposeCompleted(phase, (caught) => failures.push(caught));
        throwSingleOrAggregate(failures, SeedcordErrorCode.PluginDisposeFailures);
    }

    async #disposeCompleted(phase: ShutdownPhase | undefined, onError: (caught: unknown) => void): Promise<void> {
        for (const attachment of [...this.#attachments].reverse()) {
            if (!this.#completedInits.has(attachment)) continue;
            const { key, instance, spec } = attachment;
            const dispose = instance.dispose?.bind(instance);
            if (!dispose) continue;
            if (phase !== undefined && spec.dispose.phase !== phase) continue;

            try {
                await withTimeout(`Plugin:${key}:dispose`, dispose, spec.dispose.timeout);
            } catch (caught) {
                onError(caught);
            }
        }
    }
}
