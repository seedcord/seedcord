import type { IanaTimezone, Timezone } from './Timezone';
import type { CoreBase, JsonSafe, Stored } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';
import type { ValidDuration } from '@seedcord/utils';
import type { Simplify } from 'type-fest';

/** Options for the {@link Tasks} plugin. */
export interface TasksOptions {
    /** The folder that holds your task classes, relative to `root` from `seedcord.config.ts`. */
    path: string;
    /** The timezone for every cron task that doesn't set its own. Defaults to the system's. */
    timezone?: IanaTimezone;
    /**
     * How long in-flight runs get to finish during shutdown, in milliseconds.
     *
     * @defaultValue `10_000`
     */
    timeout?: number;
}

/** The options `@RegisterTask` takes after a cron pattern. */
export interface TaskOptions<TZone extends string = string> {
    /**
     * The task's identity in logs, bus events, and stored jobs. Set it on a scheduled task to keep its
     * pending jobs working through a class rename.
     *
     * @defaultValue The class name.
     */
    key?: string;
    /** Overrides the plugin's `timezone` for this task. */
    timezone?: Timezone<TZone>;
    /**
     * Skips a cron or manual run while the last one is still running, and calls `onOverrun()` for it.
     * A scheduled job waits for the last run to end instead, so its data still runs.
     *
     * @defaultValue `true`
     */
    protect?: boolean;
    /**
     * Starts the task's pattern paused. Call `resume()` to start it. Scheduled jobs and `trigger()`
     * still run the task.
     *
     * @defaultValue `false`
     */
    paused?: boolean;
    /** Stops the task after this many runs. */
    maxRuns?: number;
    /** The task doesn't run before this date. A pattern match exactly at this date runs. */
    startAt?: Date | string;
    /** The task doesn't run after this date. */
    stopAt?: Date | string;
}

// a scheduled run carries its job's id, and only a failed run carries an error
type TaskRun = Simplify<
    { key: string; durationMs: number } & (
        { trigger: 'scheduled'; jobId: string } | { trigger: 'cron' | 'manual'; jobId: null }
    ) &
        ({ outcome: 'finished' } | { outcome: 'failed'; error: Error })
>;

/** What started a run. */
export type TaskTrigger = TaskRun['trigger'];

// no-invalid-void-type rejects a bare void in a conditional type
type NoData = ReturnType<() => void>;

/**
 * `TData` after its trip through the store. A `Date` in `TData` reads back as its ISO string, the
 * same as a record from a `KvCollection`.
 */
export type TaskData<TData> = unknown extends TData ? unknown : [TData] extends [NoData] ? NoData : Stored<TData>;

/** What the plugin passes to a task's constructor. */
export interface TaskContext<TData = unknown> {
    core: CoreBase;
    logger: Logger;
    key: string;
    data: TaskData<TData>;
    signal: AbortSignal;
    startedAt: Date;
    trigger: TaskTrigger;
}

/** When a scheduled job runs. Pass `in` or `at`. */
export type When<TIn extends string = string> =
    { in: ValidDuration<TIn>; at?: never } | { at: Date | number; in?: never };

type HasData<TData> = [TData] extends [Exclude<TData, void>] ? true : false;

type StorableData<TData> = [TData] extends [JsonSafe<TData>]
    ? TData
    : 'This task data holds a value JSON cannot keep, like a function, Map, Set, or bigint.';

/** The options `schedule()` takes. `data` follows the task's type argument. */
export type ScheduleOptions<TData, TIn extends string = string> = When<TIn> &
    (HasData<TData> extends true ? { data: StorableData<TData> } : { data?: never });

/** One cron task, as `crons()` reports it. */
export interface CronStatus {
    key: string;
    pattern: string;
    timezone: string | undefined;
    /** Whether the pattern's timer is on. `false` before `ready()`, while the task is paused, and once it has no runs left. */
    active: boolean;
    busy: boolean;
    nextRun: Date | null;
    previousRun: Date | null;
}

/** One scheduled job waiting to run. */
export interface ScheduledJob {
    id: string;
    key: string;
    at: Date;
}

declare module '@seedcord/core' {
    interface Subscriptions {
        /** A task run ended. `outcome` says whether it returned or threw. */
        taskRan: TaskRun;
    }
}
