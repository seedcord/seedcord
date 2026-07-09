import chalk from 'chalk';

import { CoordinatedLifecycle } from './CoordinatedLifecycle';

import type { LifecycleTask, PhaseEventMap } from './LifecycleTypes';
import type { UnionToTuple } from 'type-fest';

/**
 * Shutdown phases for coordinated application shutdown.
 */
export enum ShutdownPhase {
    /** Stop accepting new requests/interactions */
    StopAcceptingRequests = 1,
    /** Stop background services (health checks, etc.) */
    StopServices,
    /** Disconnect from external resources (database, APIs) */
    ExternalResources,
    /** Disconnect from Discord */
    DiscordCleanup,
    /** Final cleanup tasks */
    FinalCleanup
}

/** Define the order of phases */
const PHASE_ORDER: ShutdownPhase[] = [
    ShutdownPhase.StopAcceptingRequests,
    ShutdownPhase.StopServices,
    ShutdownPhase.ExternalResources,
    ShutdownPhase.DiscordCleanup,
    ShutdownPhase.FinalCleanup
];

/**
 * Strict-event-emitter payload map for coordinated shutdown phases.
 */
export type CoordinatedShutdownEvents = PhaseEventMap<'shutdown', UnionToTuple<ShutdownPhase>>;

// Delay process.exit so the logger's file sink has a window to flush before the event loop dies.
const LOG_FLUSH_DELAY_MS = 500;

/**
 * CoordinatedShutdown manages graceful application shutdown by executing registered tasks across defined phases.
 *
 * It listens for termination signals (SIGINT, SIGTERM) and runs tasks in parallel within each phase.
 * Tasks can be added or removed dynamically, and each task has an associated timeout.
 */
export class CoordinatedShutdown extends CoordinatedLifecycle<ShutdownPhase, CoordinatedShutdownEvents> {
    private readonly isShutdownEnabled: boolean;

    private isShuttingDown = false;
    private exitCode = 0;
    private onSigTerm: (() => void) | null = null;
    private onSigInt: (() => void) | null = null;

    public constructor(enabled = true) {
        super('CoordinatedShutdown', PHASE_ORDER, ShutdownPhase);

        this.isShutdownEnabled = enabled;
        this.registerSignalHandlers();
    }

    protected canAddTask(): boolean {
        return this.isShutdownEnabled;
    }

    protected canRemoveTask(): boolean {
        return true;
    }

    protected getTaskType(): string {
        return 'shutdown';
    }

    protected async executeTasksInPhase(
        phase: ShutdownPhase,
        tasks: LifecycleTask[]
    ): Promise<PromiseSettledResult<void>[]> {
        const promises = tasks.map((task) => this.runTaskWithTimeout(phase, task));
        return Promise.allSettled(promises);
    }

    private registerSignalHandlers(): void {
        if (!this.isShutdownEnabled) return;

        this.onSigTerm = () => {
            this.logger.info(`Received ${chalk.yellow.bold('SIGTERM')} signal`);
            void this.run(0);
        };

        this.onSigInt = () => {
            this.logger.info(`Received ${chalk.yellow.bold('SIGINT')} signal`);
            void this.run(0);
        };

        process.on('SIGTERM', this.onSigTerm);
        process.on('SIGINT', this.onSigInt);
    }

    private removeSignalHandlers(): void {
        if (this.onSigTerm) {
            process.off('SIGTERM', this.onSigTerm);
            this.onSigTerm = null;
        }
        if (this.onSigInt) {
            process.off('SIGINT', this.onSigInt);
            this.onSigInt = null;
        }
    }

    /**
     * Adds a task to a specific shutdown phase with timeout.
     *
     * @param phase - The shutdown phase from {@link ShutdownPhase}
     * @param taskName - Unique identifier for the task
     * @param task - Async function to execute
     * @param timeoutMs - Task timeout in milliseconds. {@default `5000`}
     */
    public override addTask(phase: ShutdownPhase, taskName: string, task: () => Promise<void>, timeoutMs = 5000): void {
        super.addTask(phase, taskName, task, timeoutMs);
    }

    /**
     * Removes a task from a specific shutdown phase.
     *
     * @param phase - The shutdown phase to remove from
     * @param taskName - Name of the task to remove
     * @returns True if task was found and removed
     */
    public override removeTask(phase: ShutdownPhase, taskName: string): boolean {
        return super.removeTask(phase, taskName);
    }

    /**
     * Executes the coordinated shutdown sequence.
     *
     * Runs all registered tasks across shutdown phases in reverse order.
     * Tasks within each phase are executed in parallel for faster shutdown.
     * Process exits with the specified code when complete.
     *
     * @param exitCode - Process exit code. {@default `0`}
     * @param exitProcess - Whether to exit the process after shutdown. {@default `true`}
     * @returns Promise that resolves when shutdown is complete
     * @example
     * ```typescript
     * shutdown.addTask(ShutdownPhase.Services, 'database', () => db.disconnect(), 5000);
     * await shutdown.run(0); // Graceful shutdown
     * ```
     */
    public async run(exitCode = 0, exitProcess = true): Promise<void> {
        this.removeSignalHandlers();

        if (this.isShuttingDown) {
            this.logger.warn('Shutdown sequence already in progress');
            return;
        }

        this.isShuttingDown = true;
        this.exitCode = exitCode;
        this.logger.info(
            `${chalk.bold.yellow('Starting')} coordinated shutdown with exit code ${chalk.bold.cyan(exitCode)}`
        );
        this.emitSafe('shutdown:start');

        try {
            for (const phase of PHASE_ORDER) {
                await this.runPhase(phase);
            }

            this.logger.info(`${chalk.bold.green('Coordinated shutdown completed')} successfully`);
            this.emitSafe('shutdown:complete');
        } catch (error) {
            this.logger.error(`${chalk.bold.red('Coordinated shutdown failed')}`);
            this.emitSafe('shutdown:error', error);
        } finally {
            if (exitProcess) {
                this.logger.info(`${chalk.bold.red('Exiting')} process with code ${chalk.bold.cyan(this.exitCode)}`);
                setTimeout(() => {
                    process.exit(this.exitCode);
                }, LOG_FLUSH_DELAY_MS);
            } else {
                this.logger.info(`${chalk.bold.yellow('Skipping')} process exit (dev mode)`);
                this.isShuttingDown = false;
            }
        }
    }
}
