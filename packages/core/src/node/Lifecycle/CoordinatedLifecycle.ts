/*
 * Inspired by Akka Coordinated Shutdown: https://doc.akka.io/libraries/akka-core/current/coordinated-shutdown.html
 * and Lewis's implementation in a private repo elsewhere (https://github.com/Yomanz)
 */

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordAggregateError, SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import { withTimeout } from './withTimeout';

import type { LifecycleTask } from './LifecycleTypes';

// base for the startup and shutdown coordinators, runs phase-ordered tasks off a per-phase map
export abstract class CoordinatedLifecycle<TPhase extends number> {
    protected readonly logger: Logger;
    protected readonly tasksMap = new Map<TPhase, LifecycleTask[]>();

    protected constructor(
        loggerName: string,
        protected readonly phaseOrder: TPhase[],
        protected readonly phaseEnum: Record<number, string>
    ) {
        this.logger = new Logger(loggerName, { channel: 'lifecycle' });
        this.phaseOrder.forEach((phase) => this.tasksMap.set(phase, []));
    }

    public addTask(phase: TPhase, taskName: string, task: () => Promise<void>, timeoutMs: number): void {
        if (!this.canAddTask()) return;

        const tasks = this.tasksMap.get(phase);
        if (!tasks) {
            throw new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, [phase]);
        }

        tasks.push({ name: taskName, task, timeout: timeoutMs });
        this.logger.debug(
            `${paint.italic('Added')} ${this.getTaskType()} task ${paint.sky.bold(taskName)} to phase ${paint.iris.bold(this.phaseEnum[phase])}`
        );
    }

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
                `${paint.italic('Removed')} ${this.getTaskType()} task ${paint.sky.bold(taskName)} from phase ${paint.iris.bold(this.phaseEnum[phase])}`
            );
        }

        return removed;
    }

    protected async runPhase(phase: TPhase): Promise<void> {
        const tasks = this.tasksMap.get(phase) ?? [];
        if (tasks.length === 0) {
            this.logger.trace(`No tasks to run in phase ${paint.iris.bold(this.phaseEnum[phase])}`);
            return;
        }

        this.logger.debug(
            `${paint.amber.bold('Running')} ${this.getTaskType()} phase ${paint.iris.bold(this.phaseEnum[phase])} with ${paint.sky.bold(String(tasks.length))} tasks`
        );

        const results: PromiseSettledResult<void>[] = await this.executeTasksInPhase(phase, tasks);

        const reasons = results.reduce<unknown[]>((rejected, result) => {
            if (result.status === 'rejected') rejected.push(result.reason as unknown);
            return rejected;
        }, []);
        if (reasons.length > 0) {
            // paint here would leak ANSI codes into the serialized error message (the unknown-exception webhook)
            throw new SeedcordAggregateError(SeedcordErrorCode.LifecyclePhaseFailures, reasons, [
                this.phaseEnum[phase],
                reasons.length
            ]);
        }

        this.logger.debug(
            `Phase ${paint.iris.bold(this.phaseEnum[phase])} ${paint.mint.bold('completed successfully')}`
        );
    }

    protected async runTaskWithTimeout(phase: TPhase, task: LifecycleTask): Promise<void> {
        this.logger.trace(
            `${paint.italic('Starting')} task ${paint.sky.bold(task.name)} in phase ${paint.iris.bold(this.phaseEnum[phase])}`
        );

        try {
            await withTimeout(task.name, task.task, task.timeout);

            this.logger.trace(
                `${paint.italic('Completed')} task ${paint.sky.bold(task.name)} in phase ${paint.iris.bold(this.phaseEnum[phase])}`
            );
        } catch (error) {
            if (this.isAborted()) return;
            this.logger.error(
                `${paint.italic('Failed')} task ${paint.sky.bold(task.name)} in phase ${paint.iris.bold(this.phaseEnum[phase])}:`,
                error
            );
            throw error;
        }
    }

    protected isAborted(): boolean {
        return false;
    }

    protected abstract canAddTask(): boolean;
    protected abstract canRemoveTask(): boolean;
    protected abstract getTaskType(): string;
    protected abstract executeTasksInPhase(
        phase: TPhase,
        tasks: LifecycleTask[]
    ): Promise<PromiseSettledResult<void>[]>;
}
