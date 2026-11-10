import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined, parseDuration } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';
import { Cron, CronDate } from 'croner';

import { CronJob } from './CronJob';
import { requireTimezone } from './requireTimezone';

import type { TaskMetadata } from './decorators/RegisterTask';
import type { CronSlot, LoadedTask, TaskRegistry, TaskSlot } from './TaskRegistry';
import type { TaskRunner } from './TaskRunner';
import type { CronStatus } from './types/Tasks';

type CronMetadata = Extract<TaskMetadata, { kind: 'cron' }>;

const SECOND_MS = 1000;

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

        // the constructor has already checked the plugin's timezone
        requireTimezone(optionOf(loaded, 'timezone'), meta.timezone);

        // croner treats a string with a colon as a one-off date
        if (pattern.includes(':')) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidOption, [
                optionOf(loaded, 'pattern'),
                pattern,
                `That's a date, which croner would run once. For a task that runs once, call ${paint.bold('schedule()')}.`
            ]);
        }

        if (meta.maxRuns !== undefined && !(Number.isSafeInteger(meta.maxRuns) && meta.maxRuns >= 1)) {
            throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksInvalidOption, [
                optionOf(loaded, 'maxRuns'),
                String(meta.maxRuns),
                'Pass a whole number of 1 or more, or leave it out for no limit.'
            ]);
        }

        const gap = meta.every === undefined ? {} : { interval: readEvery(loaded, meta.every) };
        const timezone = meta.timezone ?? this.defaultTimezone;
        const dates = keepDefined({ startAt: meta.startAt, stopAt: meta.stopAt });
        checkDates(loaded, dates, timezone);

        const run = async (claim: () => boolean): Promise<void> => {
            await this.runner.run(loaded, { trigger: 'cron', jobId: null }, undefined, claim);
        };
        const build = (): Cron => new Cron(pattern, { ...(timezone !== undefined && { timezone }), ...gap, ...dates });

        let job: CronJob;

        try {
            job = new CronJob(build, run, {
                pattern,
                timezone,
                maxRuns: meta.maxRuns,
                pausedByDecorator: meta.paused ?? false
            });
        } catch (error) {
            throw new SeedcordTypeError(
                SeedcordErrorCode.PluginTasksInvalidPattern,
                [key, file, pattern, cronerReason(error)],
                { cause: error }
            );
        }

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
        if (this.started && !slot.paused) slot.cron?.start();
        else slot.cron?.stop();
    }

    public list(): CronStatus[] {
        return this.registry.cronSlots().map((slot) => ({
            key: slot.loaded.key,
            pattern: slot.cron.settings.pattern,
            timezone: slot.cron.settings.timezone,
            active: slot.cron.active,
            busy: slot.state.busy,
            nextRun: this.nextRun(slot),
            previousRun: slot.cron.previousRun()
        }));
    }
}

// strips croner's 'CronPattern: ' prefix. croner shows a bad day or month off by one, like 32 as 31,
// and this keeps only the field name for those two
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
        throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidOption, [
            optionOf(loaded, 'stopAt'),
            String(stopAt),
            `That isn't after its ${paint.bold('startAt')} of ${paint.sky(String(startAt))}, so the task never runs. Move ${paint.bold('stopAt')} later.`
        ]);
    }
}

// CronDate reads a date string in the task's timezone. new Date() would read it in the machine's
function readDate(loaded: LoadedTask, option: string, value: Date | string, timezone: string | undefined): number {
    try {
        return new CronDate(value, timezone).getTime();
    } catch (error) {
        throw new SeedcordTypeError(
            SeedcordErrorCode.PluginTasksInvalidOption,
            [
                optionOf(loaded, option),
                String(value),
                `Croner can't read that as a date. Pass a ${paint.bold('Date')}, or an ISO 8601 string like ${paint.sky("'2027-01-01T09:00:00'")}. A string without an offset reads in the task's timezone.`
            ],
            { cause: error }
        );
    }
}

// croner's interval counts whole seconds
function readEvery(loaded: LoadedTask, every: string): number {
    const ms = parseDuration(every);
    if (ms === null) {
        throw new SeedcordTypeError(SeedcordErrorCode.InvalidDuration, [optionOf(loaded, 'every'), every]);
    }

    if (ms % SECOND_MS !== 0) {
        throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksInvalidOption, [
            optionOf(loaded, 'every'),
            every,
            `croner spaces runs in whole seconds. Write a whole number of seconds or more, like ${paint.sky("'90s'")} or ${paint.sky("'2m'")}.`
        ]);
    }

    return ms / SECOND_MS;
}

function optionOf({ key, file }: LoadedTask, option: string): string {
    return `The ${paint.bold(option)} of the task ${paint.sky(key)} in ${paint.path(file)}`;
}
