import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import chalk from 'chalk';

import { StartupPhase } from '@src/lifecycle/phases';

import { CoordinatedLifecycle } from './CoordinatedLifecycle';

import type { LifecycleTask } from './LifecycleTypes';

const PHASE_ORDER: StartupPhase[] = [StartupPhase.Configuration, StartupPhase.Login, StartupPhase.Ready];

export class CoordinatedStartup extends CoordinatedLifecycle<StartupPhase> {
    private isStartingUp = false;
    private hasStarted = false;

    public constructor() {
        super('Startup', PHASE_ORDER, StartupPhase);
    }

    public override addTask(
        phase: StartupPhase,
        taskName: string,
        task: () => Promise<void>,
        timeoutMs = 10_000
    ): void {
        super.addTask(phase, taskName, task, timeoutMs);
    }

    protected canAddTask(): boolean {
        if (this.hasStarted) {
            throw new SeedcordError(SeedcordErrorCode.LifecycleAddAfterCompletion);
        }

        if (this.isStartingUp) {
            throw new SeedcordError(SeedcordErrorCode.LifecycleAddDuringRun);
        }

        return true;
    }

    protected canRemoveTask(): boolean {
        if (this.isStartingUp) {
            throw new SeedcordError(SeedcordErrorCode.LifecycleRemoveDuringRun);
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
    public async run(): Promise<void> {
        if (this.hasStarted) {
            this.logger.warn('Startup sequence has already completed');
            return;
        }

        if (this.isStartingUp) {
            this.logger.warn('Startup sequence already in progress');
            return;
        }

        this.isStartingUp = true;
        this.logger.info(`${chalk.bold.green('Starting')} coordinated startup sequence`);

        try {
            for (const phase of PHASE_ORDER) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abort() can flip isStartingUp to false mid-loop from the cli
                if (!this.isStartingUp) {
                    this.logger.warn('Startup sequence aborted');
                    return;
                }
                await this.runPhase(phase);
            }

            this.hasStarted = true;
            this.logger.info(`${chalk.bold.green('Coordinated startup completed')} successfully`);
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abort() can flip isStartingUp to false before this catch runs
            if (!this.isStartingUp) {
                this.logger.warn('Startup sequence aborted during error handling');
                return;
            }
            this.logger.error(`${chalk.bold.red('Coordinated startup failed')}`);
            throw error;
        } finally {
            this.isStartingUp = false;
        }
    }

    protected override isAborted(): boolean {
        return !this.isStartingUp;
    }

    public abort(): void {
        if (!this.isStartingUp) return;

        this.isStartingUp = false;
        this.logger.warn('Aborting coordinated startup sequence');
    }

    public get isReady(): boolean {
        return this.hasStarted;
    }

    public get isRunning(): boolean {
        return this.isStartingUp;
    }
}
