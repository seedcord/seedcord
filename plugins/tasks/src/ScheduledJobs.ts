import { randomUUID } from 'node:crypto';

import { paint } from '@seedcord/errors';

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

// setTimeout overflows past this, so a longer wait sets a new timer in steps
const MAX_TIMEOUT_MS = 2_147_483_647;
// short enough that a job runs close to its time once the driver answers again
const STORE_RETRY_MS = 30_000;

export class ScheduledJobs {
    private readonly pending = new Map<string, Pending>();
    private readonly firing = new Set<string>();
    private started = false;
    private warnedInMemory = false;

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
        this.warnIfInMemory();

        const job: Pending = { id, key, at, timer: undefined };
        this.pending.set(id, job);
        this.setTimer(job);

        // a copy, since the timer reads job.at and a caller may change what it gets back
        return { id, key, at: new Date(at) };
    }

    public async cancel(id: string): Promise<boolean> {
        if (this.firing.has(id)) return false;

        const job = this.pending.get(id);
        if (!job && (await this.records.get(id)) === undefined) return false;

        // the timer stops first, so the job can't come due while the delete is in flight
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
        return [...this.pending.values()].map(({ id, key, at }) => ({ id, key, at: new Date(at) }));
    }

    private setTimer(job: Pending, delayMs = job.at.getTime() - Date.now()): void {
        if (!this.started) return;

        job.timer = setTimeout(
            () => {
                if (job.at.getTime() > Date.now()) this.setTimer(job);
                else void this.runner.track(this.fire(job));
            },
            Math.min(Math.max(delayMs, 0), MAX_TIMEOUT_MS)
        );
    }

    // fire() deletes the record only after the run ends, so a crash mid-run leaves the job for the next start
    private async fire(job: Pending): Promise<void> {
        this.pending.delete(job.id);
        this.firing.add(job.id);

        try {
            const record = await this.read(job);
            if (!record) return;

            const loaded = this.findTask(record.key);

            if (!loaded) {
                this.logger.warn(
                    `no task has the key ${paint.sky(record.key)}, so job ${paint.sky(job.id)} is still in the store`
                );
                return;
            }

            const outcome = await this.runner.run(loaded, { trigger: 'scheduled', jobId: job.id }, record.data);
            if (outcome !== 'interrupted') await this.forget(job.id);
        } finally {
            this.firing.delete(job.id);
        }
    }

    private warnIfInMemory(): void {
        if (!this.inMemory || this.warnedInMemory) return;

        this.warnedInMemory = true;
        this.logger.warn(
            `this process holds scheduled jobs in memory, so they end when it exits. Pass a driver as ${paint.bold('kv')} in your config to keep them through a restart`
        );
    }

    private async read(job: Pending): Promise<JobRecord | undefined> {
        try {
            return await this.records.get(job.id);
        } catch (error) {
            this.logger.error(
                `could not read job ${paint.sky(job.id)}. The plugin tries again in ${STORE_RETRY_MS}ms`,
                error
            );
            this.pending.set(job.id, job);
            this.setTimer(job, STORE_RETRY_MS);

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
