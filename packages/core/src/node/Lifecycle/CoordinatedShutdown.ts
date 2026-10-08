import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordRangeError } from '@seedcord/errors/internal';

import { CoordinatedLifecycle } from '#src/lifecycle/CoordinatedLifecycle';
import { ShutdownPhase } from '#src/lifecycle/phases';
import { settleWithin } from '#src/lifecycle/withTimeout';

import type { LifecycleTask } from '#src/lifecycle/LifecycleTypes';

const PHASE_ORDER: ShutdownPhase[] = [
    ShutdownPhase.Unbind,
    ShutdownPhase.Drain,
    ShutdownPhase.Disconnect,
    ShutdownPhase.Logout
];

// gives the logger's file sink time to flush before process.exit
const LOG_FLUSH_DELAY_MS = 3000;

// 25s plus LOG_FLUSH_DELAY_MS stays under kubernetes' 30s SIGKILL window
const DEFAULT_SHUTDOWN_DEADLINE_MS = 25_000;

export class CoordinatedShutdown extends CoordinatedLifecycle<ShutdownPhase> {
    #running?: Promise<void>;
    #exitCode = 0;
    #onSigTerm: (() => void) | null = null;
    #onSigInt: (() => void) | null = null;
    #startupGate?: Promise<void>;
    #deadlineMs = DEFAULT_SHUTDOWN_DEADLINE_MS;
    #phasesExpireAt = Infinity;
    #runningPhase: ShutdownPhase | undefined;

    public constructor(deadlineMs?: number) {
        super('Shutdown', PHASE_ORDER, ShutdownPhase);

        if (deadlineMs !== undefined) this.setDeadline(deadlineMs);
    }

    /** @internal */
    public setDeadline(deadlineMs: number): void {
        if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) {
            throw new SeedcordRangeError(SeedcordErrorCode.LifecycleInvalidShutdownDeadline, [deadlineMs]);
        }
        this.#deadlineMs = deadlineMs;
    }

    async #runPhases(failures: unknown[]): Promise<void> {
        for (const phase of PHASE_ORDER) {
            // set above the check so the reported phase is the one that never started
            this.#runningPhase = phase;
            // runPhases keeps going after settleWithin stops waiting on it
            if (performance.now() >= this.#phasesExpireAt) return;
            try {
                await this.runPhase(phase);
            } catch (error) {
                failures.push(error);
            }
        }
        this.#runningPhase = undefined;
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

    /** @internal */
    public registerSignalHandlers(): void {
        this.#onSigTerm = () => {
            this.logger.info(`Received ${paint.amber.bold('SIGTERM')} signal`);
            void this.run(0);
        };

        this.#onSigInt = () => {
            this.logger.info(`Received ${paint.amber.bold('SIGINT')} signal`);
            void this.run(0);
        };

        process.on('SIGTERM', this.#onSigTerm);
        process.on('SIGINT', this.#onSigInt);
    }

    /** @internal */
    public removeSignalHandlers(): void {
        if (this.#onSigTerm) {
            process.off('SIGTERM', this.#onSigTerm);
            this.#onSigTerm = null;
        }
        if (!this.#onSigInt) {
            return;
        }

        process.off('SIGINT', this.#onSigInt);
        this.#onSigInt = null;
    }

    /** @internal run() awaits this so boot finishes registering its dispose tasks first */
    public gateOnStartup(settled: Promise<void>): void {
        this.#startupGate = settled;
    }

    public override addTask(phase: ShutdownPhase, taskName: string, task: () => Promise<void>, timeoutMs = 5000): void {
        super.addTask(phase, taskName, task, timeoutMs);
    }

    /** @internal */
    public override removeTask(phase: ShutdownPhase, taskName: string): boolean {
        return super.removeTask(phase, taskName);
    }

    // a later call waits on the first run and never repeats a task
    /** @internal */
    public run(exitCode = 0, exitProcess = true): Promise<void> {
        this.removeSignalHandlers();

        if (this.#running) {
            // a crash mid-shutdown must still leave a failing code for whatever supervises the process
            if (exitCode > this.#exitCode) this.#exitCode = exitCode;
            return this.#running;
        }

        this.#exitCode = exitCode;
        this.#running = this.#shutDown(exitProcess);
        return this.#running;
    }

    async #shutDown(exitProcess: boolean): Promise<void> {
        this.logger.info(
            `${paint.amber.bold('Starting')} coordinated shutdown with exit code ${paint.sky.bold(this.#exitCode)}`
        );

        try {
            this.#phasesExpireAt = performance.now() + this.#deadlineMs;
            // a startup that outlasts the deadline leaves its own dispose tasks unregistered
            if (this.#startupGate) await settleWithin(this.#startupGate, this.#deadlineMs);

            const failures: unknown[] = [];
            await settleWithin(this.#runPhases(failures), Math.max(this.#phasesExpireAt - performance.now(), 0));

            const caughtPhase = this.#runningPhase;
            if (caughtPhase !== undefined) {
                this.logger.error(
                    `Shutdown deadline of ${paint.sky.bold(this.#deadlineMs)}ms elapsed at phase ${paint.iris.bold(this.phaseEnum[caughtPhase])}`
                );
            }

            if (failures.length > 0) {
                this.logger.error(`${paint.coral.bold('Coordinated shutdown failed')}`, ...failures);
            } else if (caughtPhase === undefined) {
                this.logger.info(`${paint.mint.bold('Coordinated shutdown completed')} successfully`);
            }
        } finally {
            if (exitProcess) {
                this.logger.debug(`${paint.coral.bold('Exiting')} process with code ${paint.sky.bold(this.#exitCode)}`);
                setTimeout(() => {
                    process.exit(this.#exitCode);
                }, LOG_FLUSH_DELAY_MS);
            } else {
                this.logger.debug(`${paint.amber.bold('Skipping')} process exit (dev mode)`);
            }
        }
    }
}
