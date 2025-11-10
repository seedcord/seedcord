/*
 * Inspired by Akka Coordinated Shutdown: https://doc.akka.io/libraries/akka-core/current/coordinated-shutdown.html
 * and Lewis's implementation in a private repo elsewhere (https://github.com/Yomanz)
 */

import { EventEmitter } from 'node:events';

import chalk from 'chalk';

import { SeedcordError, SeedcordErrorCode } from '../Errors';
import { Logger } from '../Logger';

import type { LifecycleTask } from './LifecycleTypes';

/**
 * Abstract base class for coordinated lifecycle management (startup/shutdown)
 */
export abstract class CoordinatedLifecycle<TPhase extends number> {
    protected readonly logger: Logger;
    protected readonly events = new EventEmitter();
    protected readonly tasksMap = new Map<TPhase, LifecycleTask[]>();

    protected constructor(
        loggerName: string,
        protected readonly phaseOrder: TPhase[],
        protected readonly phaseEnum: Record<number, string>
    ) {
        this.logger = new Logger(loggerName);
        // Initialize phases
        this.phaseOrder.forEach((phase) => this.tasksMap.set(phase, []));
    }

    /**
     * Adds a lifecycle task to a specific phase.
     *
     * Tasks are executed in phase order during lifecycle operations.
     * Each task has a timeout to prevent hanging operations.
     *
     * @param phase - The lifecycle phase to add the task to
     * @param taskName - Unique name for the task (used for logging and removal)
     * @param task - Async function to execute during the phase
     * @param timeoutMs - Maximum time allowed for task execution in milliseconds
     * @example
     * ```typescript
     * lifecycle.addTask(StartupPhase.Services, 'start-database', async () => {
     *   await database.connect();
     * }, 10000);
     * ```
     */
    public addTask(phase: TPhase, taskName: string, task: () => Promise<void>, timeoutMs: number): void {
        if (!this.canAddTask()) return;

        const tasks = this.tasksMap.get(phase);
        if (!tasks) {
            throw new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, [phase]);
        }

        tasks.push({ name: taskName, task, timeout: timeoutMs });
        this.logger.debug(
            `${chalk.italic('Added')} ${this.getTaskType()} task ${chalk.bold.cyan(taskName)} to phase ${chalk.bold.magenta(this.phaseEnum[phase])}`
        );
    }

    /**
     * Removes a lifecycle task from a specific phase.
     *
     * @param phase - The lifecycle phase to remove the task from
     * @param taskName - Name of the task to remove
     * @returns True if the task was found and removed, false otherwise
     */
    public removeTask(phase: TPhase, taskName: string): boolean {
        if (!this.canRemoveTask()) return false;

        const tasks = this.tasksMap.get(phase);
        if (!tasks) return false;

        const initialLength = tasks.length;
        const filteredTasks = tasks.filter((task) => task.name !== taskName);
        this.tasksMap.set(phase, filteredTasks);

        const removed = initialLength !== filteredTasks.length;
        if (removed) {
            this.logger.debug(
                `${chalk.italic('Removed')} ${this.getTaskType()} task ${chalk.bold.cyan(taskName)} from phase ${chalk.bold.magenta(this.phaseEnum[phase])}`
            );
        }

        return removed;
    }

    /**
     * Run all tasks in a specific phase
     */
    protected async runPhase(phase: TPhase): Promise<void> {
        const tasks = this.tasksMap.get(phase) ?? [];
        if (tasks.length === 0) {
            this.logger.warn(`No tasks to run in phase ${chalk.bold.magenta(this.phaseEnum[phase])}`);
            return;
        }

        this.logger.info(
            `${chalk.bold.yellow('Running')} ${this.getTaskType()} phase ${chalk.bold.magenta(this.phaseEnum[phase])} with ${chalk.bold.cyan(tasks.length)} tasks`
        );
        this.emit(`phase:${phase}:start`);

        // Execute all tasks with the execution strategy
        const results: PromiseSettledResult<void>[] = await this.executeTasksInPhase(phase, tasks);

        // Check results
        const failures = results.filter((r) => r.status === 'rejected').length;
        if (failures > 0) {
            throw new SeedcordError(SeedcordErrorCode.LifecyclePhaseFailures, [
                chalk.bold.magenta(this.phaseEnum[phase]),
                failures
            ]);
        } else {
            this.logger.info(
                `Phase ${chalk.bold.magenta(this.phaseEnum[phase])} ${chalk.bold.green('completed successfully')}`
            );
        }

        this.emit(`phase:${phase}:complete`);
    }

    /**
     * Run a single task with timeout
     */
    protected async runTaskWithTimeout(phase: TPhase, task: LifecycleTask): Promise<void> {
        this.logger.info(
            `${chalk.italic('Starting')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(this.phaseEnum[phase])}`
        );

        try {
            // Create a race between the task and a timeout
            await Promise.race([
                task.task(),
                new Promise<void>((_, reject) => {
                    setTimeout(() => {
                        reject(new SeedcordError(SeedcordErrorCode.LifecycleTaskTimeout, [task.name, task.timeout]));
                    }, task.timeout);
                })
            ]);

            this.logger.info(
                `${chalk.italic('Completed')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(this.phaseEnum[phase])}`
            );
        } catch (error) {
            this.logger.error(
                `${chalk.italic('Failed')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(this.phaseEnum[phase])}:`,
                error
            );
            throw error;
        }
    }

    /**
     * Subscribe to lifecycle events
     */
    public on(event: string, listener: (...args: unknown[]) => void): void {
        this.events.on(event, listener);
    }

    /**
     * Unsubscribe from lifecycle events
     */
    public off(event: string, listener: (...args: unknown[]) => void): void {
        this.events.off(event, listener);
    }

    protected emit(event: string, ...args: unknown[]): boolean {
        return this.events.emit(event, ...args);
    }

    // Abstract methods to be implemented by subclasses
    protected abstract canAddTask(): boolean;
    protected abstract canRemoveTask(): boolean;
    protected abstract getTaskType(): string;
    protected abstract executeTasksInPhase(
        phase: TPhase,
        tasks: LifecycleTask[]
    ): Promise<PromiseSettledResult<void>[]>;
}
