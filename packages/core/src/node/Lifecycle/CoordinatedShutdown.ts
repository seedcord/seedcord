import chalk from 'chalk';

import { ShutdownPhase } from '@src/lifecycle/phases';

import { CoordinatedLifecycle } from './CoordinatedLifecycle';

import type { LifecycleTask } from './LifecycleTypes';

const PHASE_ORDER: ShutdownPhase[] = [
    ShutdownPhase.Unbind,
    ShutdownPhase.Drain,
    ShutdownPhase.Disconnect,
    ShutdownPhase.Logout
];

// gives the logger's file sink time to flush before process.exit
const LOG_FLUSH_DELAY_MS = 3000;

/**
 * Runs registered shutdown tasks across `ShutdownPhase` in order. Registers SIGINT and SIGTERM
 * handlers. Tasks within a phase run in parallel.
 */
export class CoordinatedShutdown extends CoordinatedLifecycle<ShutdownPhase> {
    private isShuttingDown = false;
    private hasShutdown = false;
    private exitCode = 0;
    private onSigTerm: (() => void) | null = null;
    private onSigInt: (() => void) | null = null;
    private startupGate?: Promise<void>;

    public constructor() {
        super('Shutdown', PHASE_ORDER, ShutdownPhase);

        this.registerSignalHandlers();
    }

    protected canAddTask(): boolean {
        return true;
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

    /** @internal */
    public removeSignalHandlers(): void {
        if (this.onSigTerm) {
            process.off('SIGTERM', this.onSigTerm);
            this.onSigTerm = null;
        }
        if (this.onSigInt) {
            process.off('SIGINT', this.onSigInt);
            this.onSigInt = null;
        }
    }

    /** @internal run() awaits this so boot finishes registering its dispose tasks first */
    public gateOnStartup(settled: Promise<void>): void {
        this.startupGate = settled;
    }

    /**
     * Adds a shutdown-phase task.
     *
     * @param phase - The shutdown phase to run the task in.
     * @param taskName - A descriptive name for the task.
     * @param task - The async function to run.
     * @param timeoutMs - Task timeout in ms. {@default `5000` }
     */
    public override addTask(phase: ShutdownPhase, taskName: string, task: () => Promise<void>, timeoutMs = 5000): void {
        super.addTask(phase, taskName, task, timeoutMs);
    }

    /** Removes a shutdown-phase task, returning whether one was removed. */
    public override removeTask(phase: ShutdownPhase, taskName: string): boolean {
        return super.removeTask(phase, taskName);
    }

    /**
     * Runs registered tasks across shutdown phases in `ShutdownPhase` order.
     * Tasks within each phase run in parallel.
     *
     * @param exitCode - Process exit code. {@default `0` }
     * @param exitProcess - Whether to exit the process after shutdown. {@default `true` }
     * @example
     * ```typescript
     * shutdown.addTask(ShutdownPhase.Disconnect, 'database', () => db.disconnect(), 5000);
     * await shutdown.run(0);
     * ```
     */
    public async run(exitCode = 0, exitProcess = true): Promise<void> {
        this.removeSignalHandlers();

        // a dev-mode run leaves the process alive, so a second call would re-execute every task
        if (this.hasShutdown || this.isShuttingDown) {
            this.logger.warn('Shutdown sequence already ran or is in progress');
            return;
        }

        this.isShuttingDown = true;
        this.exitCode = exitCode;
        this.logger.info(
            `${chalk.bold.yellow('Starting')} coordinated shutdown with exit code ${chalk.bold.cyan(exitCode)}`
        );

        try {
            if (this.startupGate) await this.startupGate;
            const failures: unknown[] = [];
            for (const phase of PHASE_ORDER) {
                // run every phase so a mid-shutdown failure still attempts the later teardowns
                try {
                    await this.runPhase(phase);
                } catch (error) {
                    failures.push(error);
                }
            }

            if (failures.length > 0) {
                this.logger.error(`${chalk.bold.red('Coordinated shutdown failed')}`, ...failures);
            } else {
                this.logger.info(`${chalk.bold.green('Coordinated shutdown completed')} successfully`);
            }
        } finally {
            this.hasShutdown = true;
            if (exitProcess) {
                this.logger.debug(`${chalk.bold.red('Exiting')} process with code ${chalk.bold.cyan(this.exitCode)}`);
                setTimeout(() => {
                    process.exit(this.exitCode);
                }, LOG_FLUSH_DELAY_MS);
            } else {
                this.logger.debug(`${chalk.bold.yellow('Skipping')} process exit (dev mode)`);
                this.isShuttingDown = false;
            }
        }
    }
}
