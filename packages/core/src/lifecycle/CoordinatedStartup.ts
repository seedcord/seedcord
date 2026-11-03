import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { StartupPhase } from '#src/lifecycle/phases';

import { CoordinatedLifecycle } from './CoordinatedLifecycle';

import type { LifecycleTask } from './LifecycleTypes';
import type { Promisable } from 'type-fest';

const PHASE_ORDER: StartupPhase[] = [StartupPhase.Configuration, StartupPhase.Login, StartupPhase.Ready];

/** Adds work to a bot's startup. */
export type StartupTasks = Pick<CoordinatedStartup, 'addTask'>;

export class CoordinatedStartup extends CoordinatedLifecycle<StartupPhase> {
    #state: 'idle' | 'running' | 'stopped' | 'finished' = 'idle';

    public constructor() {
        super('Startup', PHASE_ORDER, StartupPhase);
    }

    /**
     * Adds a task to a startup phase. The task gets a signal that aborts when it runs past `timeoutMs`
     * or when startup is aborted. Pass it to any request the task makes.
     */
    public override addTask(
        phase: StartupPhase,
        taskName: string,
        task: LifecycleTask['task'],
        timeoutMs = 10_000
    ): void {
        super.addTask(phase, taskName, task, timeoutMs);
    }

    protected canAddTask(): boolean {
        if (this.#state === 'finished') {
            throw new SeedcordError(SeedcordErrorCode.LifecycleTaskChangeRejected, ['add', 'finished']);
        }

        if (this.#state === 'running') {
            throw new SeedcordError(SeedcordErrorCode.LifecycleTaskChangeRejected, ['add', 'running']);
        }

        return true;
    }

    protected canRemoveTask(): boolean {
        if (this.#state === 'running') {
            throw new SeedcordError(SeedcordErrorCode.LifecycleTaskChangeRejected, ['remove', 'running']);
        }

        return true;
    }

    protected getTaskType(): string {
        return 'startup';
    }

    protected async executeTasksInPhase(
        phase: StartupPhase,
        tasks: LifecycleTask[]
    ): Promise<PromiseSettledResult<void>[]> {
        const promises = tasks.map((task) => this.runTaskWithTimeout(phase, task));
        return Promise.allSettled(promises);
    }

    // each phase completes fully before the next begins
    /** @internal */
    public async run(afterReady?: () => Promisable<void>): Promise<void> {
        if (this.#state === 'finished') {
            this.logger.warn('Startup sequence has already completed');
            return;
        }

        if (this.#state === 'running') {
            this.logger.warn('Startup sequence already in progress');
            return;
        }

        this.#state = 'running';
        this.beginRun();
        this.logger.info(`${paint.mint.bold('Starting')} coordinated startup sequence`);

        const steps: (() => Promisable<void>)[] = PHASE_ORDER.map((phase) => () => this.runPhase(phase));
        if (afterReady) steps.push(afterReady);

        try {
            for (const step of steps) {
                await step();
                if (this.isAborted()) {
                    this.logger.warn('Startup sequence aborted');
                    return;
                }
            }

            this.#state = 'finished';
            this.logger.info(`${paint.mint.bold('Coordinated startup completed')} successfully`);
        } catch (error) {
            if (this.isAborted()) {
                this.logger.warn('Startup sequence aborted during error handling');
                return;
            }
            this.#state = 'stopped';
            this.logger.error(`${paint.coral.bold('Coordinated startup failed')}`);
            throw error;
        }
    }

    protected override isAborted(): boolean {
        return this.#state !== 'running';
    }

    /** @internal */
    public abort(): void {
        if (this.#state !== 'running') return;

        this.#state = 'stopped';
        this.abortRun();
        this.logger.warn('Aborting coordinated startup sequence');
    }

    /** @internal */
    public get isReady(): boolean {
        return this.#state === 'finished';
    }

    /** @internal */
    public get hasBegun(): boolean {
        return this.#state !== 'idle';
    }
}
