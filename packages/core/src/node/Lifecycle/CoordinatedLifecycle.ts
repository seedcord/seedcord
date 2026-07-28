/*
 * Inspired by Akka Coordinated Shutdown: https://doc.akka.io/libraries/akka-core/current/coordinated-shutdown.html
 * and Lewis's implementation in a private repo elsewhere (https://github.com/Yomanz)
 */

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import chalk from 'chalk';

import { withTimeout } from './withTimeout';

import type { LifecycleTask } from './LifecycleTypes';

/**
 * Base for the startup and shutdown coordinators. Runs phase-ordered tasks off a per-phase map.
 *
 * @internal
 */
export abstract class CoordinatedLifecycle<TPhase extends number> {
    protected readonly logger: Logger;
    protected readonly tasksMap = new Map<TPhase, LifecycleTask[]>();

    protected constructor(
        loggerName: string,
        protected readonly phaseOrder: TPhase[],
        protected readonly phaseEnum: Record<number, string>
    ) {
        this.logger = new Logger(loggerName);
        this.phaseOrder.forEach((phase) => this.tasksMap.set(phase, []));
    }

    /**
     * Adds a task to `phase`. Tasks run in phase order, each bounded by `timeoutMs`.
     *
     * @param phase - The lifecycle phase to add the task to
     * @param taskName - Unique name for the task, used for logging and removal
     * @param task - Async function to execute during the phase
     * @param timeoutMs - Maximum time allowed for task execution in milliseconds
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

    protected async runPhase(phase: TPhase): Promise<void> {
        const tasks = this.tasksMap.get(phase) ?? [];
        if (tasks.length === 0) {
            this.logger.debug(`No tasks to run in phase ${chalk.bold.magenta(this.phaseEnum[phase])}`);
            return;
        }

        this.logger.info(
            `${chalk.bold.yellow('Running')} ${this.getTaskType()} phase ${chalk.bold.magenta(this.phaseEnum[phase])} with ${chalk.bold.cyan(tasks.length)} tasks`
        );

        const results: PromiseSettledResult<void>[] = await this.executeTasksInPhase(phase, tasks);

        const failures = results.filter((r) => r.status === 'rejected').length;
        if (failures > 0) {
            // chalk here would leak ANSI codes into the serialized error message (the unknown-exception webhook)
            throw new SeedcordError(SeedcordErrorCode.LifecyclePhaseFailures, [this.phaseEnum[phase], failures]);
        }

        this.logger.info(
            `Phase ${chalk.bold.magenta(this.phaseEnum[phase])} ${chalk.bold.green('completed successfully')}`
        );
    }

    protected async runTaskWithTimeout(phase: TPhase, task: LifecycleTask): Promise<void> {
        this.logger.info(
            `${chalk.italic('Starting')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(this.phaseEnum[phase])}`
        );

        try {
            await withTimeout(task.name, task.task, task.timeout);

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

    protected abstract canAddTask(): boolean;
    protected abstract canRemoveTask(): boolean;
    protected abstract getTaskType(): string;
    protected abstract executeTasksInPhase(
        phase: TPhase,
        tasks: LifecycleTask[]
    ): Promise<PromiseSettledResult<void>[]>;
}
