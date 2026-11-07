import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';
import { Cron, CronDate } from 'croner';

import { CronJob } from './CronJob';
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

        if (meta.maxRuns !== undefined && !(Number.isSafeInteger(meta.maxRuns) && meta.maxRuns >= 1)) {
            throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksInvalidMaxRuns, [key, file, meta.maxRuns]);
        }

        const timezone = meta.timezone ?? this.defaultTimezone;
        const dates = keepDefined({ startAt: meta.startAt, stopAt: meta.stopAt });
        checkDates(loaded, dates, timezone);

        let cron: Cron;

        try {
            cron = new Cron(pattern, {
                ...(timezone !== undefined && { timezone }),
                ...keepDefined({ maxRuns: meta.maxRuns }),
                ...dates
            });
        } catch (error) {
            throw new SeedcordTypeError(
                SeedcordErrorCode.PluginTasksInvalidPattern,
                [key, file, pattern, cronerReason(error)],
                { cause: error }
            );
        }

        const run = async (): Promise<void> => {
            await this.runner.run(loaded, { trigger: 'cron', jobId: null }, undefined);
        };
        const job = new CronJob(cron, run, pattern, timezone, meta.paused ?? false);

        slot.cron = job;
        this.sync(slot);
    }

    public remove(slot: TaskSlot): void {
        slot.cron?.stop();
        slot.cron = undefined;
    }

    public start(): void {
        this.started = true;

        for (const slot of this.registry.cronSlots()) this.sync(slot);
    }

    public stop(): void {
        this.started = false;

        for (const slot of this.registry.cronSlots()) slot.cron.stop();
    }

    public pause(slot: CronSlot): void {
        slot.pause();
        this.sync(slot);
    }

    public resume(slot: CronSlot): void {
        slot.resume();
        this.sync(slot);
    }

    public nextRun(slot: CronSlot): Date | null {
        return slot.paused ? null : slot.cron.nextRun();
    }

    private sync(slot: TaskSlot): void {
        slot.cron?.setRunning(this.started && !slot.paused);
    }

    public list(): CronStatus[] {
        return this.registry.cronSlots().map((slot) => ({
            key: slot.loaded.key,
            pattern: slot.cron.pattern,
            timezone: slot.cron.timezone,
            active: slot.cron.active,
            busy: slot.state.busy,
            nextRun: this.nextRun(slot),
            previousRun: slot.cron.previousRun()
        }));
    }
}

// croner prefixes its messages with its class name, and it shows a rejected day or month counted
// from 0, so 32 reads as 31. For those two the field name alone points at the right part
function cronerReason(error: unknown): string {
    return asError(error)
        .message.replace(/^CronPattern: /, '')
        .replace(/^(Invalid value for (?:day|month)): .*$/, '$1');
}

function checkDates(
    loaded: LoadedTask,
    { startAt, stopAt }: Pick<CronMetadata, 'startAt' | 'stopAt'>,
    timezone: string | undefined
): void {
    const start = startAt === undefined ? undefined : readDate(loaded, 'startAt', startAt, timezone);
    const stop = stopAt === undefined ? undefined : readDate(loaded, 'stopAt', stopAt, timezone);

    if (start !== undefined && stop !== undefined && stop <= start) {
        throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksStopBeforeStart, [
            loaded.key,
            loaded.file,
            String(startAt),
            String(stopAt)
        ]);
    }
}

// croner reads a date string in the task's timezone, so a plain new Date() could read it as a different time
function readDate(
    { key, file }: LoadedTask,
    option: string,
    value: Date | string,
    timezone: string | undefined
): number {
    try {
        return new CronDate(value, timezone).getTime();
    } catch (error) {
        throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidDate, [key, file, option, String(value)], {
            cause: error
        });
    }
}
