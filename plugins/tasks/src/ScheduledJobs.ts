import { randomUUID } from 'node:crypto';

import { paint } from '@seedcord/errors';

import type { Registered, TaskRunner } from './TaskRunner';
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

// setTimeout overflows past this, so longer waits re-arm in steps
const MAX_TIMEOUT_MS = 2_147_483_647;
// short enough that a job runs close to its time once the driver answers again
const STORE_RETRY_MS = 30_000;

export class ScheduledJobs {
    private readonly pending = new Map<string, Pending>();
    private readonly firing = new Set<string>();
    private armed: 'before-start' | 'running' | 'stopped' = 'before-start';

    constructor(
        private readonly records: KvCollection<JobRecord>,
        private readonly runner: TaskRunner,
        private readonly findTask: (key: string) => Registered | undefined,
        private readonly logger: Logger
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
        this.armed = 'running';
        for (const job of this.pending.values()) this.arm(job);
    }

    public stop(): void {
        this.armed = 'stopped';

        for (const job of this.pending.values()) clearTimeout(job.timer);
        this.pending.clear();
    }

    public async add(key: string, at: Date, data: JsonValue | undefined): Promise<ScheduledJob> {
        const id = randomUUID();
        await this.records.set(id, { key, at: at.getTime(), ...(data !== undefined && { data }) });

        const job: Pending = { id, key, at, timer: undefined };
        this.pending.set(id, job);
        this.arm(job);

        return { id, key, at };
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
                this.arm(job);
            }
            throw error;
        }

        return true;
    }

    public list(): ScheduledJob[] {
        return [...this.pending.values()].map(({ id, key, at }) => ({ id, key, at }));
    }

    private arm(job: Pending, delayMs = job.at.getTime() - Date.now()): void {
        if (this.armed !== 'running') return;

        job.timer = setTimeout(
            () => {
                if (job.at.getTime() > Date.now()) this.arm(job);
                else void this.runner.track(this.fire(job));
            },
            Math.min(Math.max(delayMs, 0), MAX_TIMEOUT_MS)
        );
    }

    // the record stays until the run ends, so a crash mid-run leaves the job for the next start
    private async fire(job: Pending): Promise<void> {
        this.pending.delete(job.id);
        this.firing.add(job.id);

        try {
            const record = await this.read(job);
            if (!record) return;

            const registered = this.findTask(record.key);

            if (!registered) {
                this.logger.warn(`no task has the key ${paint.sky(record.key)}, job ${paint.sky(job.id)} stays stored`);
                return;
            }

            const outcome = await this.runner.run(registered, 'scheduled', record.data, job.id);
            if (outcome !== 'interrupted') await this.forget(job.id);
        } finally {
            this.firing.delete(job.id);
        }
    }

    private async read(job: Pending): Promise<JobRecord | undefined> {
        try {
            return await this.records.get(job.id);
        } catch (error) {
            this.logger.error(`could not read job ${paint.sky(job.id)}, trying again in ${STORE_RETRY_MS}ms`, error);
            this.pending.set(job.id, job);
            this.arm(job, STORE_RETRY_MS);

            return undefined;
        }
    }

    private async forget(id: string): Promise<void> {
        try {
            await this.records.delete(id);
        } catch (error) {
            this.logger.error(`could not delete job ${paint.sky(id)}, it runs again after a restart`, error);
        }
    }
}
