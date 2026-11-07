import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';
import { Cron, CronDate } from 'croner';

import { isTimezone } from './schedule';

import type { TaskMetadata } from './decorators/RegisterTask';
import type { LoadedTask, TaskRunner } from './TaskRunner';
import type { CronStatus } from './types/Tasks';

type CronMetadata = Extract<TaskMetadata, { kind: 'cron' }>;

/** A cron task's croner job. A save rebuilds it, and the task's run state lives on `loaded.state`. */
export interface CronEntry {
    readonly loaded: LoadedTask;
    readonly job: Cron;
    readonly pattern: string;
    readonly timezone: string | undefined;
}

export class CronTasks {
    private readonly entries = new Map<string, CronEntry>();
    private started = false;

    constructor(
        private readonly runner: TaskRunner,
        private readonly defaultTimezone: string | undefined
    ) {}

    public get size(): number {
        return this.entries.size;
    }

    public get(key: string): CronEntry | undefined {
        return this.entries.get(key);
    }

    public add(loaded: LoadedTask, meta: CronMetadata): void {
        const { key, file } = loaded;
        const { pattern } = meta;

        // the constructor already checked the plugin's timezone
        if (meta.timezone !== undefined && !isTimezone(meta.timezone)) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidTimezone, [
                `The ${paint.bold('timezone')} of the task ${paint.sky(key)} in ${paint.path(file)}`,
                meta.timezone
            ]);
        }

        // croner treats a string with a colon as a one-off date
        if (pattern.includes(':')) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksDateAsPattern, [key, file, pattern]);
        }

        const timezone = meta.timezone ?? this.defaultTimezone;
        const dates = keepDefined({ startAt: meta.startAt, stopAt: meta.stopAt });
        for (const [option, value] of Object.entries(dates)) checkDate(loaded, option, value, timezone);

        let job: Cron;

        try {
            job = new Cron(
                pattern,
                {
                    paused: true,
                    ...(timezone !== undefined && { timezone }),
                    ...keepDefined({ maxRuns: meta.maxRuns }),
                    ...dates
                },
                async () => {
                    await this.runner.run(loaded, { trigger: 'cron', jobId: null }, undefined);
                }
            );
        } catch (error) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidPattern, [key, file, pattern], {
                cause: error
            });
        }

        this.entries.set(key, { loaded, job, pattern, timezone });

        if (this.started && !loaded.state.paused) job.resume();
    }

    public remove(key: string): void {
        this.entries.get(key)?.job.stop();
        this.entries.delete(key);
    }

    public start(): void {
        this.started = true;

        for (const { job, loaded } of this.entries.values()) {
            if (!loaded.state.paused) job.resume();
        }
    }

    public stop(): void {
        for (const entry of this.entries.values()) entry.job.stop();
    }

    public pause({ job, loaded }: CronEntry): void {
        loaded.state.paused = true;
        job.pause();
    }

    public resume({ job, loaded }: CronEntry): void {
        loaded.state.paused = false;
        if (this.started) job.resume();
    }

    public nextRun({ job, loaded }: CronEntry): Date | null {
        return loaded.state.paused ? null : job.nextRun();
    }

    public list(): CronStatus[] {
        return [...this.entries.values()].map((entry) => ({
            key: entry.loaded.key,
            pattern: entry.pattern,
            timezone: entry.timezone,
            active: entry.job.isRunning(),
            busy: entry.loaded.state.busy,
            nextRun: this.nextRun(entry),
            previousRun: entry.job.previousRun()
        }));
    }
}

// croner reads a date string in the task's timezone, so a plain new Date() could disagree with it
function checkDate(
    { key, file }: LoadedTask,
    option: string,
    value: Date | string,
    timezone: string | undefined
): void {
    try {
        // eslint-disable-next-line no-new -- the constructor is the check, since it throws for a date croner can't read
        new CronDate(value, timezone);
    } catch (error) {
        throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidDate, [key, option, String(value), file], {
            cause: error
        });
    }
}
