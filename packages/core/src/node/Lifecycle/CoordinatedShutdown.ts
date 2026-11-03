import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordRangeError } from '@seedcord/errors/internal';

import { CoordinatedLifecycle } from '#src/lifecycle/CoordinatedLifecycle';
import { ShutdownPhase } from '#src/lifecycle/phases';
import { settleWithin } from '#src/lifecycle/withTimeout';

import type { LifecycleTask } from '#src/lifecycle/LifecycleTypes';
import type { TaskShutdownPhase } from '#src/lifecycle/phases';
import type { Tail } from '@seedcord/types';

/** Adds work to a node bot's shutdown, in any phase before `ShutdownPhase.Release`. */
export interface ShutdownTasks {
    addTask(phase: TaskShutdownPhase, ...rest: Tail<Parameters<CoordinatedShutdown['addTask']>>): void;
}

const PHASE_ORDER: ShutdownPhase[] = [
    ShutdownPhase.Unbind,
    ShutdownPhase.Drain,
    ShutdownPhase.Disconnect,
    ShutdownPhase.Logout,
    ShutdownPhase.Release
];

const SHUTDOWN_SIGNALS: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

// gives the logger's file sink time to flush before process.exit
const LOG_FLUSH_DELAY_MS = 3000;

// 25s plus LOG_FLUSH_DELAY_MS stays under kubernetes' 30s SIGKILL window
const DEFAULT_SHUTDOWN_DEADLINE_MS = 25_000;

export class CoordinatedShutdown extends CoordinatedLifecycle<ShutdownPhase> {
    #running?: Promise<void>;
    #exitCode = 0;
    readonly #signalHandlers = new Map<NodeJS.Signals, () => void>();
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
            throw new SeedcordRangeError(SeedcordErrorCode.LifecycleInvalidTimeout, [
                'lifecycle.shutdownDeadline',
                deadlineMs
            ]);
        }
        this.#deadlineMs = deadlineMs;
    }

    async #runPhases(failures: unknown[]): Promise<void> {
        for (const phase of PHASE_ORDER) {
            // set first so the deadline log shows this phase
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
        for (const signal of SHUTDOWN_SIGNALS) {
            const handler = (): void => {
                this.logger.info(`Received ${paint.amber.bold(signal)} signal`);
                void this.run(0);
            };
            this.#signalHandlers.set(signal, handler);
            process.on(signal, handler);
        }
    }

    /** @internal */
    public removeSignalHandlers(): void {
        for (const [signal, handler] of this.#signalHandlers) process.off(signal, handler);
        this.#signalHandlers.clear();
    }

    // run() awaits this so boot finishes registering its dispose tasks first
    /** @internal */
    public gateOnStartup(settled: Promise<void>): void {
        this.#startupGate = settled;
    }

    public override addTask(
        phase: ShutdownPhase,
        taskName: string,
        task: LifecycleTask['task'],
        timeoutMs = 5000
    ): void {
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

            const unfinishedPhase = this.#runningPhase;
            if (unfinishedPhase !== undefined) {
                this.logger.error(
                    `Shutdown deadline of ${paint.sky.bold(this.#deadlineMs)}ms elapsed at phase ${paint.iris.bold(this.phaseEnum[unfinishedPhase])}`
                );
            }

            if (failures.length > 0) {
                this.logger.error(`${paint.coral.bold('Coordinated shutdown failed')}`, ...failures);
            } else if (unfinishedPhase === undefined) {
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
