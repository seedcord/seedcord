import type { IanaTimezone, Timezone } from './Timezone';
import type { CoreBase, Storable, Stored } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';
import type { ValidDuration } from '@seedcord/utils';
import type { IsUnknown, RequireExactlyOne, Simplify } from 'type-fest';

/** Options for the {@link Tasks} plugin. */
export interface TasksOptions {
    /** The folder that holds your task classes, relative to `root` from `seedcord.config.ts`. */
    path: string;
    /** The timezone for every cron job that doesn't set its own. Defaults to the system's. */
    timezone?: IanaTimezone;
    /**
     * How long in-flight runs get to finish during shutdown, in milliseconds.
     *
     * @defaultValue `10_000`
     */
    timeout?: number;
    /**
     * Lets cron jobs and scheduled jobs run on their own under `seedcord dev`. Without it, cron jobs start
     * paused and scheduled jobs wait for a restart outside `seedcord dev`. `trigger()` still runs a task
     * without data by hand.
     *
     * @defaultValue `false`
     */
    runInDev?: boolean;
}

/** The options `@RegisterTask` takes after a cron pattern. */
export interface TaskOptions<TZone extends string = string, TEvery extends string = string> {
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
     * Skips a cron or manual run before the previous run has finished, and calls `onOverrun()` for it.
     * A scheduled task waits for the previous run to end. Skipping it would lose the job's data.
     *
     * @defaultValue `true`
     */
    protect?: boolean;
    /**
     * Starts the task's pattern paused. Call `resume()` to start it. Scheduled tasks and `trigger()`
     * still run the task.
     *
     * @defaultValue `false`
     */
    paused?: boolean;
    /** Stops the task after this many runs. */
    maxRuns?: number;
    /**
     * The shortest gap between two runs, as a duration in whole seconds like `'90s'` or `'5m'`. The task
     * still only runs at times that the pattern matches. For example, `'* * 9-17 * * 1-5'` with
     * `every: '90s'` runs every 90 seconds during those hours. After `resume()`, the task runs at its
     * next match, and the gap counts from there.
     */
    every?: ValidDuration<TEvery>;
    /**
     * The task doesn't run before this date. A pattern match exactly at this date runs.
     */
    startAt?: Date | string;
    /** The task doesn't run after this date. A pattern match exactly at this date doesn't run either. */
    stopAt?: Date | string;
}

type TaskRun = Simplify<
    { key: string; durationMs: number } & (
        | { trigger: 'scheduled'; jobId: string }
        | { trigger: 'cron' | 'manual'; jobId: null }
    ) &
        ({ outcome: 'finished' | 'interrupted' } | { outcome: 'failed'; error: Error })
>;

/** What started a run. */
export type TaskTrigger = TaskRun['trigger'];

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- a task without data declares Task<void>
type NoData = void;

type IsNoData<TData> = [TData] extends [NoData] ? true : false;

/**
 * `TData` after its trip through the store. A `Date` in `TData` reads back as its ISO string, the
 * same as a record from a `KvCollection`. A job scheduled with `undefined` doesn't store any data and
 * reads back as `undefined`.
 */
export type TaskData<TData> =
    IsUnknown<TData> extends true
        ? unknown
        : IsNoData<TData> extends true
          ? NoData
          : Stored<Exclude<TData, undefined>> | Extract<TData, undefined>;

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

/** When a scheduled task runs. Pass `in` or `at`. */
export type When<TIn extends string = string> = RequireExactlyOne<{ in: ValidDuration<TIn>; at: Date | number }>;

/** The options `schedule()` takes. `data` follows the task's type argument. */
export type ScheduleOptions<TData, TIn extends string = string> = When<TIn> &
    (IsNoData<TData> extends true ? { data?: never } : { data: Storable<TData, 'task data'> });

/** One cron job, as `crons()` reports it. */
export interface CronStatus {
    key: string;
    pattern: string;
    timezone: string | undefined;
    /** Whether the pattern's timer is on. `false` before `ready()`, while the task is paused, and once it doesn't have any runs left. */
    active: boolean;
    busy: boolean;
    nextRun: Date | null;
    previousRun: Date | null;
}

/** One scheduled task waiting to run. */
export interface ScheduledJob {
    id: string;
    key: string;
    at: Date;
}

declare module '@seedcord/core' {
    interface Subscriptions {
        /** A task run ended. `outcome` is `'finished'` if it returned, `'failed'` if it threw, and `'interrupted'` if it threw after shutdown aborted it. */
        taskRan: TaskRun;
    }
}
