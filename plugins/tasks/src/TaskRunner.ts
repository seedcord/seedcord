import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';

import type { TaskClass } from './decorators/RegisterTask';
import type { Task } from './Task';
import type { TaskData, TaskTrigger } from './types/Tasks';
import type { CoreBase, Subscriptions } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';

export interface Registered {
    readonly key: string;
    readonly Task: TaskClass;
    readonly logger: Logger;
}

export type RunOutcome = 'finished' | 'failed' | 'interrupted';

type FailedRun = Omit<Subscriptions['taskFailed'], 'durationMs' | 'error'> & { startedAt: number };

export class TaskRunner {
    private readonly running = new Set<Promise<unknown>>();
    private readonly shutdown = new AbortController();

    constructor(
        private readonly core: CoreBase,
        private readonly logger: Logger
    ) {}

    public run(
        registered: Registered,
        trigger: TaskTrigger,
        data: TaskData<unknown>,
        jobId: string | null
    ): Promise<RunOutcome> {
        return this.track(this.execute(registered, trigger, data, jobId));
    }

    public async overrun(registered: Registered): Promise<void> {
        try {
            await this.instantiate(registered, 'cron', undefined).onOverrun?.();
        } catch (error) {
            this.logger.error(`${paint.sky(registered.key)} threw during its overrun`, error);
        }
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

    private instantiate(registered: Registered, trigger: TaskTrigger, data: TaskData<unknown>): Task<unknown> {
        return new registered.Task({
            core: this.core,
            logger: registered.logger,
            key: registered.key,
            data,
            signal: this.shutdown.signal,
            startedAt: new Date(),
            trigger
        });
    }

    private async execute(
        registered: Registered,
        trigger: TaskTrigger,
        data: TaskData<unknown>,
        jobId: string | null
    ): Promise<RunOutcome> {
        const { key } = registered;
        const startedAt = Date.now();
        let task: Task<unknown>;

        try {
            task = this.instantiate(registered, trigger, data);
        } catch (thrown) {
            this.fail({ key, trigger, jobId, startedAt }, thrown);
            return 'failed';
        }

        try {
            await task.execute();
            this.core.bus.publish('taskFinished', { key, trigger, jobId, durationMs: Date.now() - startedAt });

            return 'finished';
        } catch (thrown) {
            const error = this.fail({ key, trigger, jobId, startedAt }, thrown);

            try {
                await task.onError?.(error);
            } catch (inner) {
                this.logger.error(`${paint.sky(key)} threw from onError`, inner);
            }

            return this.shutdown.signal.aborted ? 'interrupted' : 'failed';
        }
    }

    private fail({ key, trigger, jobId, startedAt }: FailedRun, thrown: unknown): Error {
        const error = asError(thrown);
        const durationMs = Date.now() - startedAt;

        this.logger.error(`${paint.sky(key)} threw after ${durationMs}ms`, error);
        this.core.bus.publish('taskFailed', { key, trigger, jobId, durationMs, error });

        return error;
    }
}
