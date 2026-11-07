import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';

import { TaskState } from './TaskState';

import type { TaskClass } from './decorators/RegisterTask';
import type { Task } from './Task';
import type { TaskData, TaskTrigger } from './types/Tasks';
import type { CoreBase, Subscriptions } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';
import type { DistributedPick } from 'type-fest';

export interface LoadedTask {
    readonly key: string;
    readonly Task: TaskClass;
    readonly file: string;
    readonly logger: Logger;
    readonly state: TaskState;
}

export type RunOutcome = 'finished' | 'failed' | 'interrupted' | 'skipped';

/** What started a run, with the job's id when a scheduled job did. */
export type RunSource = DistributedPick<Subscriptions['taskRan'], 'trigger' | 'jobId'>;

export class TaskRunner {
    private readonly running = new Set<Promise<unknown>>();
    private readonly states = new Map<string, TaskState>();
    private readonly shutdown = new AbortController();

    constructor(
        private readonly core: CoreBase,
        private readonly logger: Logger
    ) {}

    /**
     * The state for `key`. A key seen before keeps its state, `paused` included, and takes the new
     * `protect`, so a save that reloads a task doesn't reset what `pause()` did.
     */
    public state(key: string, protect: boolean, paused: boolean): TaskState {
        const existing = this.states.get(key);
        if (!existing) {
            const state = new TaskState(protect, paused);
            this.states.set(key, state);

            return state;
        }

        existing.protect = protect;
        return existing;
    }

    /**
     * Runs a task. While a `protect`ed task is busy, a cron or manual run is skipped and calls
     * `onOverrun()`, and a scheduled run waits for the busy one to end so its data still runs.
     */
    public async run(loaded: LoadedTask, source: RunSource, data: TaskData<unknown>): Promise<RunOutcome> {
        const { state } = loaded;

        if (state.protect && state.busy && source.trigger !== 'scheduled') {
            this.logger.warn(`skipped a run of ${paint.sky(loaded.key)}, the previous one is still running`);
            await this.track(this.callOverrun(loaded, source.trigger));

            return 'skipped';
        }

        // the check and the add below share a tick, so two waiting jobs can't both start
        while (state.protect && state.busy) await state.settled();
        if (this.shutdown.signal.aborted) return 'interrupted';

        const run = this.track(this.execute(loaded, source, data));
        state.add(run);

        return run;
    }

    public track<TResult>(work: Promise<TResult>): Promise<TResult> {
        this.running.add(work);
        void work.finally(() => this.running.delete(work));

        return work;
    }

    public async stop(): Promise<void> {
        this.shutdown.abort();
        await Promise.allSettled(this.running);
    }

    private async callOverrun(loaded: LoadedTask, trigger: TaskTrigger): Promise<void> {
        try {
            await this.instantiate(loaded, trigger, undefined, new Date()).onOverrun?.();
        } catch (error) {
            this.logger.error(`${paint.sky(loaded.key)} threw during its overrun`, error);
        }
    }

    private instantiate(
        loaded: LoadedTask,
        trigger: TaskTrigger,
        data: TaskData<unknown>,
        startedAt: Date
    ): Task<unknown> {
        return new loaded.Task({
            core: this.core,
            logger: loaded.logger,
            key: loaded.key,
            data,
            signal: this.shutdown.signal,
            startedAt,
            trigger
        });
    }

    private async execute(loaded: LoadedTask, source: RunSource, data: TaskData<unknown>): Promise<RunOutcome> {
        const { key } = loaded;
        const startedAt = new Date();
        let task: Task<unknown>;

        try {
            task = this.instantiate(loaded, source.trigger, data, startedAt);
        } catch (thrown) {
            this.fail(key, source, startedAt, thrown);
            return 'failed';
        }

        try {
            await task.execute();
            this.core.bus.publish('taskRan', { key, ...source, durationMs: elapsedMs(startedAt), outcome: 'finished' });

            return 'finished';
        } catch (thrown) {
            const error = this.fail(key, source, startedAt, thrown);

            try {
                await task.onError?.(error);
            } catch (inner) {
                this.logger.error(`${paint.sky(key)} threw from onError`, inner);
            }

            return this.shutdown.signal.aborted ? 'interrupted' : 'failed';
        }
    }

    private fail(key: string, source: RunSource, startedAt: Date, thrown: unknown): Error {
        const error = asError(thrown);
        const durationMs = elapsedMs(startedAt);

        this.logger.error(`${paint.sky(key)} threw after ${durationMs}ms`, error);
        this.core.bus.publish('taskRan', { key, ...source, durationMs, outcome: 'failed', error });

        return error;
    }
}

const elapsedMs = (since: Date): number => Date.now() - since.getTime();
