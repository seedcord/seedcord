import { randomUUID } from 'node:crypto';

import { paint } from '@seedcord/errors';
import { clamp, once } from 'es-toolkit';

import type { LoadedTask } from './TaskRegistry';
import type { TaskRunner } from './TaskRunner';
import type { ScheduledJob } from './types/Tasks';
import type { KvCollection } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';
import type { JsonValue } from 'type-fest';

export interface JobRecord {
    key: string;
    at: number;
    data?: JsonValue;
}

interface Pending extends ScheduledJob {
    timer: NodeJS.Timeout | undefined;
}

interface RunningJob {
    readonly job: Pending;
    state: 'waiting' | 'started' | 'cancelled';
}

// setTimeout's largest delay. A longer wait sets the timer again in steps
const MAX_TIMEOUT_MS = 2_147_483_647;
// short enough that a job runs close to its time once the driver answers again
const STORE_RETRY_MS = 30_000;

export class ScheduledJobs {
    private readonly pending = new Map<string, Pending>();
    private readonly runningJobs = new Map<string, RunningJob>();
    private started = false;
    private readonly warnInMemory = once(() => {
        this.logger.warn(
            `this process holds scheduled tasks in memory, so they're lost when it exits. Pass a driver as ${paint.bold('kv')} in your config to keep them through a restart`
        );
    });

    constructor(
        private readonly records: KvCollection<JobRecord>,
        private readonly runner: TaskRunner,
        private readonly findTask: (key: string) => LoadedTask | undefined,
        private readonly logger: Logger,
        private readonly inMemory: boolean
    ) {}

    public get size(): number {
        return this.pending.size;
    }

    public async restore(): Promise<void> {
        for await (const [id, record] of this.records.entries()) {
            this.pending.set(id, { id, key: record.key, at: new Date(record.at), timer: undefined });
        }
    }

    public start(): void {
        this.started = true;
        for (const job of this.pending.values()) this.setTimer(job);
    }

    public stop(): void {
        this.started = false;

        for (const job of this.pending.values()) clearTimeout(job.timer);
        this.pending.clear();
    }

    public async add(key: string, at: Date, data: JsonValue | undefined): Promise<ScheduledJob> {
        const id = randomUUID();
        await this.records.set(id, { key, at: at.getTime(), ...(data !== undefined && { data }) });
        if (this.inMemory) this.warnInMemory();

        const job: Pending = { id, key, at, timer: undefined };
        this.pending.set(id, job);
        this.setTimer(job);

        // returns a copy of at. The timer reads job.at, and the caller could change the date it gets
        return { id, key, at: new Date(at) };
    }

    public async cancel(id: string): Promise<boolean> {
        const running = this.runningJobs.get(id);
        if (running?.state === 'waiting') return this.cancelWaiting(running);
        if (running) return false;

        const job = this.pending.get(id);
        if (!job && (await this.records.get(id)) === undefined) return false;

        // clear the timer before the delete. Otherwise the job can start while the delete runs
        if (job) {
            clearTimeout(job.timer);
            this.pending.delete(id);
        }

        try {
            await this.records.delete(id);
        } catch (error) {
            if (job) {
                this.pending.set(id, job);
                this.setTimer(job);
            }
            throw error;
        }

        return true;
    }

    public list(): ScheduledJob[] {
        return this.pending
            .values()
            .map(({ id, key, at }) => ({ id, key, at: new Date(at) }))
            .toArray();
    }

    private setTimer(job: Pending, delayMs = job.at.getTime() - Date.now()): void {
        // a failed read and a failed cancel can both call this for one job
        clearTimeout(job.timer);
        if (!this.started) return;

        job.timer = setTimeout(
            () => {
                if (job.at.getTime() > Date.now()) this.setTimer(job);
                else void this.runner.track(this.runJob(job));
            },
            clamp(delayMs, 0, MAX_TIMEOUT_MS)
        );
    }

    private async cancelWaiting(running: RunningJob): Promise<boolean> {
        const { job } = running;
        running.state = 'cancelled';

        try {
            await this.records.delete(job.id);
        } catch (error) {
            // if runJob() still holds the job, it waits again. If its wait ended during the delete, it needs a new timer
            if (this.runningJobs.get(job.id) === running) {
                running.state = 'waiting';
            } else {
                this.pending.set(job.id, job);
                this.setTimer(job);
            }
            throw error;
        }

        return true;
    }

    // deletes the record only after the run ends. A crash mid-run leaves the job for the next start
    private async runJob(job: Pending): Promise<void> {
        this.pending.delete(job.id);
        const running: RunningJob = { job, state: 'waiting' };
        this.runningJobs.set(job.id, running);

        try {
            const record = await this.read(running);
            if (!record) return;

            const loaded = this.findTask(record.key);

            if (!loaded) {
                this.logger.warn(
                    `no task has the key ${paint.sky(record.key)}, so job ${paint.sky(job.id)} is still in the store`
                );
                return;
            }

            const outcome = await this.runner.run(loaded, { trigger: 'scheduled', jobId: job.id }, record.data, () =>
                this.startRun(running)
            );
            if (outcome === 'finished' || outcome === 'failed') await this.forget(job.id);
        } finally {
            this.runningJobs.delete(job.id);
        }
    }

    private startRun(running: RunningJob): boolean {
        if (running.state !== 'waiting') return false;

        running.state = 'started';
        return true;
    }

    private async read(running: RunningJob): Promise<JobRecord | undefined> {
        const { job } = running;

        try {
            return await this.records.get(job.id);
        } catch (error) {
            this.logger.error(
                `could not read job ${paint.sky(job.id)}. The plugin tries again in ${STORE_RETRY_MS}ms`,
                error
            );
            // cancelWaiting() puts a cancelled job back itself if its delete fails
            if (running.state === 'waiting') {
                this.pending.set(job.id, job);
                this.setTimer(job, STORE_RETRY_MS);
            }

            return undefined;
        }
    }

    private async forget(id: string): Promise<void> {
        try {
            await this.records.delete(id);
        } catch (error) {
            this.logger.error(`could not delete job ${paint.sky(id)}, so it runs again after a restart`, error);
        }
    }
}
