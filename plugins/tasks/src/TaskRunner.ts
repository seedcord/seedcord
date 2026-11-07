import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';

import type { Task } from './Task';
import type { LoadedTask } from './TaskRegistry';
import type { TaskData, TaskTrigger } from './types/Tasks';
import type { CoreBase, Subscriptions } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';
import type { DistributedPick } from 'type-fest';

export type RunOutcome = Subscriptions['taskRan']['outcome'] | 'skipped' | 'cancelled';

// what started a run, with the job's id when a scheduled job did
type RunSource = DistributedPick<Subscriptions['taskRan'], 'trigger' | 'jobId'>;

export class TaskRunner {
    private readonly running = new Set<Promise<unknown>>();
    private readonly shutdown = new AbortController();

    constructor(
        private readonly core: CoreBase,
        private readonly logger: Logger
    ) {}

    public async run(
        loaded: LoadedTask,
        source: RunSource,
        data: TaskData<unknown>,
        stillWanted: () => boolean = () => true
    ): Promise<RunOutcome> {
        const { state, protect } = loaded;

        if (protect && state.busy && source.trigger !== 'scheduled') {
            this.logger.warn(`skipped a run of ${paint.sky(loaded.key)} because the previous one is still running`);
            await this.track(this.callOverrun(loaded, source.trigger));

            return 'skipped';
        }

        // the check and the add below share a tick, so two waiting jobs can't both start
        if (protect) while (state.busy) await state.settled();
        if (this.shutdown.signal.aborted) return 'interrupted';
        if (!stillWanted()) return 'cancelled';

        // the run counts as busy before execute() starts, so the runner skips a trigger() that a task calls on itself
        const { promise, resolve } = Promise.withResolvers<RunOutcome>();
        const run = this.track(promise);
        state.add(run);
        resolve(this.execute(loaded, source, data));

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
            if (this.shutdown.signal.aborted) {
                const durationMs = elapsedMs(startedAt);
                this.logger.info(`shutdown stopped ${paint.sky(key)} after ${durationMs}ms`);
                this.core.bus.publish('taskRan', { key, ...source, durationMs, outcome: 'interrupted' });

                return 'interrupted';
            }

            const error = this.fail(key, source, startedAt, thrown);

            try {
                await task.onError?.(error);
            } catch (inner) {
                this.logger.error(`${paint.sky(key)} threw from onError`, inner);
            }

            return 'failed';
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
