import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';
import { Cron, CronDate } from 'croner';

import { isTimezone } from './isTimezone';

import type { TaskMetadata } from './decorators/RegisterTask';
import type { CronSlot, LoadedTask, TaskRegistry, TaskSlot } from './TaskRegistry';
import type { TaskRunner } from './TaskRunner';
import type { CronStatus } from './types/Tasks';

type CronMetadata = Extract<TaskMetadata, { kind: 'cron' }>;

export class CronTasks {
    private started = false;

    constructor(
        private readonly registry: TaskRegistry,
        private readonly runner: TaskRunner,
        private readonly defaultTimezone: string | undefined
    ) {}

    public get size(): number {
        return this.registry.cronSlots().length;
    }

    public add(slot: TaskSlot, loaded: LoadedTask, meta: CronMetadata): void {
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
            throw new SeedcordTypeError(
                SeedcordErrorCode.PluginTasksInvalidPattern,
                [key, file, pattern, cronerReason(error)],
                { cause: error }
            );
        }

        slot.cron = { job, pattern, timezone, paused: meta.paused ?? false };
        if (this.started && !slot.paused) job.resume();
    }

    public remove(slot: TaskSlot): void {
        slot.cron?.job.stop();
        slot.cron = undefined;
    }

    public start(): void {
        this.started = true;

        for (const slot of this.registry.cronSlots()) {
            if (!slot.paused) slot.cron.job.resume();
        }
    }

    public stop(): void {
        this.started = false;

        for (const slot of this.registry.cronSlots()) slot.cron.job.stop();
    }

    public pause(slot: CronSlot): void {
        slot.pausedByCall = true;
        slot.cron.job.pause();
    }

    public resume(slot: CronSlot): void {
        slot.pausedByCall = false;
        if (this.started) slot.cron.job.resume();
    }

    public nextRun(slot: CronSlot): Date | null {
        return slot.paused ? null : slot.cron.job.nextRun();
    }

    public list(): CronStatus[] {
        return this.registry.cronSlots().map((slot) => ({
            key: slot.loaded.key,
            pattern: slot.cron.pattern,
            timezone: slot.cron.timezone,
            active: slot.cron.job.isRunning(),
            busy: slot.state.busy,
            nextRun: this.nextRun(slot),
            previousRun: slot.cron.job.previousRun()
        }));
    }
}

// croner prefixes its messages with its class name, and it shows the day and month it rejected
// counted from 0, so 32 reads as 31. The field name alone points at the right part
function cronerReason(error: unknown): string {
    return asError(error)
        .message.replace(/^CronPattern: /, '')
        .replace(/^(Invalid value for \w+): .*$/, '$1');
}

// croner reads a date string in the task's timezone, so a plain new Date() could read it as a different time
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
