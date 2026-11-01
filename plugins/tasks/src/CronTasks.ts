import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';
import { Cron } from 'croner';

import { isTimezone } from './schedule';

import type { TaskMetadata } from './decorators/RegisterTask';
import type { Registered, RunOutcome, TaskRunner } from './TaskRunner';
import type { CronStatus, TaskTrigger } from './types/Tasks';
import type { Logger } from '@seedcord/logger';

interface CronEntry {
    readonly registered: Registered;
    readonly job: Cron;
    readonly timezone: string | undefined;
    readonly protect: boolean;
    paused: boolean;
    current: Promise<RunOutcome> | undefined;
}

export class CronTasks {
    private readonly entries = new Map<string, CronEntry>();
    private started = false;

    constructor(
        private readonly runner: TaskRunner,
        private readonly logger: Logger,
        private readonly defaultTimezone: string | undefined
    ) {}

    public get size(): number {
        return this.entries.size;
    }

    public has(key: string): boolean {
        return this.entries.has(key);
    }

    public add(registered: Registered, meta: TaskMetadata, pattern: string, file: string): void {
        const { key } = registered;
        const timezone = meta.timezone ?? this.defaultTimezone;

        if (timezone !== undefined && !isTimezone(timezone)) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidTimezone, [key, file, timezone]);
        }

        // croner treats a string with a colon as a one-off date
        if (pattern.includes(':')) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksDateAsPattern, [key, file, pattern]);
        }

        let job: Cron;

        try {
            job = new Cron(
                pattern,
                {
                    paused: true,
                    ...(timezone !== undefined && { timezone }),
                    ...keepDefined({ maxRuns: meta.maxRuns, startAt: meta.startAt, stopAt: meta.stopAt })
                },
                () => this.run(key, 'cron')
            );
        } catch (error) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidPattern, [key, file, pattern], {
                cause: error
            });
        }

        const { paused = false, protect = true } = meta;
        this.entries.set(key, { registered, job, timezone, paused, protect, current: undefined });

        if (this.started && !paused) job.resume();
    }

    public remove(key: string): void {
        this.entries.get(key)?.job.stop();
        this.entries.delete(key);
    }

    public start(): void {
        this.started = true;

        for (const entry of this.entries.values()) {
            if (!entry.paused) entry.job.resume();
        }
    }

    public stop(): void {
        for (const entry of this.entries.values()) entry.job.stop();
    }

    public pause(key: string): void {
        const entry = this.entries.get(key);
        if (!entry) return;

        entry.paused = true;
        entry.job.pause();
    }

    public resume(key: string): void {
        const entry = this.entries.get(key);
        if (!entry) return;

        entry.paused = false;
        if (this.started) entry.job.resume();
    }

    public nextRun(key: string): Date | null {
        return this.entries.get(key)?.job.nextRun() ?? null;
    }

    public list(): CronStatus[] {
        return [...this.entries].map(([key, { job, timezone, current }]) => ({
            key,
            pattern: job.getPattern() ?? '',
            timezone,
            scheduled: job.isRunning(),
            busy: current !== undefined,
            nextRun: job.nextRun(),
            previousRun: job.previousRun()
        }));
    }

    public async run(key: string, trigger: TaskTrigger): Promise<void> {
        const entry = this.entries.get(key);
        if (!entry) return;

        if (entry.current && entry.protect) {
            this.logger.warn(`skipped a run of ${paint.sky(key)}, the previous one is still going`);
            await this.runner.overrun(entry.registered);

            return;
        }

        const run = this.runner.run(entry.registered, trigger, undefined, null);
        entry.current = run;

        try {
            await run;
        } finally {
            if (entry.current === run) entry.current = undefined;
        }
    }
}
