import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import chalk from 'chalk';

import { CoordinatedLifecycle } from './CoordinatedLifecycle';

import type { LifecycleTask, PhaseEventMap } from './LifecycleTypes';
import type { UnionToTuple } from 'type-fest';

/**
 * Startup phases for coordinated initialization
 *
 * Defines the order in which different components are initialized during bot startup.
 */
export enum StartupPhase {
    /** Validate environment variables and config files */
    Validation = 1,
    /** Discover plugin constructors via decorators or registry */
    Discovery,
    /** Register plugin metadata and declared dependencies */
    Registration,
    /** Inject and validate plugin-specific configuration */
    Configuration,
    /** Instantiate plugin classes with Core and arguments */
    Instantiation,
    /** Activate plugins by calling their init/setup methods */
    Activation,
    /** Mark seedcord as ready and start handling interactions */
    Ready
}

const PHASE_ORDER: StartupPhase[] = [
    StartupPhase.Validation,
    StartupPhase.Discovery,
    StartupPhase.Registration,
    StartupPhase.Configuration,
    StartupPhase.Instantiation,
    StartupPhase.Activation,
    StartupPhase.Ready
];

/**
 * Strict-event-emitter payload map for coordinated startup phases.
 */
export type CoordinatedStartupEvents = PhaseEventMap<'startup', UnionToTuple<StartupPhase>>;

/**
 * Manages bot startup lifecycle with ordered phases
 *
 * Coordinates initialization of all bot components in a predictable sequence.
 * Tasks are executed within their designated phases to ensure proper dependency order.
 */
export class CoordinatedStartup extends CoordinatedLifecycle<StartupPhase, CoordinatedStartupEvents> {
    private isStartingUp = false;
    private hasStarted = false;

    public constructor() {
        super('Startup', PHASE_ORDER, StartupPhase);
    }

    /**
     * Adds a task to a specific startup phase with timeout.
     *
     * @param phase - The startup phase from {@link StartupPhase}
     * @param taskName - Unique identifier for the task
     * @param task - Async function to execute
     * @param timeoutMs - Task timeout in milliseconds. {@default `10000`}
     */
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

    /**
     * Executes the coordinated startup sequence.
     *
     * Runs all registered tasks across startup phases in the correct order.
     * Each phase completes before the next phase begins. Tasks within a phase
     * are executed sequentially to maintain predictable initialization.
     *
     * @returns Promise that resolves when startup is complete
     * @throws An {@link Error} If startup fails or is called multiple times
     * @example
     * ```typescript
     * const startup = new CoordinatedStartup();
     * startup.addTask(StartupPhase.Services, 'database', () => db.connect(), 10000);
     * await startup.run();
     * ```
     */
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
        this.emitSafe('startup:start');

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
            this.emitSafe('startup:complete');
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abort() can flip isStartingUp to false before this catch runs
            if (!this.isStartingUp) {
                this.logger.warn('Startup sequence aborted during error handling');
                return;
            }
            this.logger.error(`${chalk.bold.red('Coordinated startup failed')}`);
            this.emitSafe('startup:error', error);
            throw error;
        } finally {
            this.isStartingUp = false;
        }
    }

    protected override async runTaskWithTimeout(phase: StartupPhase, task: LifecycleTask): Promise<void> {
        this.logger.info(
            `${chalk.italic('Starting')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(StartupPhase[phase])}`
        );

        let timeoutId: NodeJS.Timeout | undefined;

        try {
            await Promise.race([
                task.task(),
                new Promise<void>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new SeedcordError(SeedcordErrorCode.LifecycleTaskTimeout, [task.name, task.timeout]));
                    }, task.timeout);
                })
            ]);

            this.logger.info(
                `${chalk.italic('Completed')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(StartupPhase[phase])}`
            );
        } catch (error) {
            if (!this.isStartingUp) {
                return;
            }

            this.logger.error(
                `${chalk.italic('Failed')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(StartupPhase[phase])}:`,
                error
            );
            throw error;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    /**
     * Aborts the startup sequence if it is currently running.
     */
    public abort(): void {
        if (!this.isStartingUp) return;

        this.isStartingUp = false;
        this.logger.warn('Aborting coordinated startup sequence');
    }

    /**
     * Check if startup has completed
     */
    public get isReady(): boolean {
        return this.hasStarted;
    }

    /**
     * Check if startup is currently running
     */
    public get isRunning(): boolean {
        return this.isStartingUp;
    }
}
