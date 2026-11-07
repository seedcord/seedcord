import { FolderExports, MemoryDriver, ShutdownPhase } from '@seedcord/core';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';

import { CronTasks } from './CronTasks';
import { isTaskClass, taskKey, taskMetadata } from './decorators/RegisterTask';
import { isTimezone, resolveAt } from './schedule';
import { ScheduledJobs } from './ScheduledJobs';
import { TaskRunner } from './TaskRunner';

import type { CronEntry } from './CronTasks';
import type { CronTaskClass, ScheduledTaskClass, TaskClass } from './decorators/RegisterTask';
import type { JobRecord } from './ScheduledJobs';
import type { LoadedTask } from './TaskRunner';
import type { CronStatus, ScheduledJob, ScheduleOptions, TaskContext, TasksOptions, When } from './types/Tasks';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/core/plugin';
import type { JsonValue } from 'type-fest';

type DataOf<TTask> = TTask extends abstract new (context: TaskContext<infer TData>) => unknown ? TData : never;

/**
 * Runs the task classes in a folder. A task with a cron pattern runs on that schedule. Any task can
 * also run once at a later time through {@link Tasks.schedule}.
 *
 * Scheduled jobs live in the bot's `config.kv`, under this plugin's attach key. With a driver that
 * keeps its records, the driver still holds a pending job after a restart, and a job that came due
 * while the bot was down runs as soon as it starts. Renaming the attach key leaves the old key's
 * jobs behind.
 *
 * @example
 * ```ts
 * seedcord.attach('tasks', Tasks, { path: './tasks', timezone: 'UTC' });
 * ```
 */
export class Tasks extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    public static readonly id = '@seedcord/plugin-tasks';

    private readonly tasks = new Map<string, LoadedTask>();
    private readonly runner: TaskRunner;
    private readonly cronTasks: CronTasks;
    private readonly scheduled: ScheduledJobs;
    private readonly reloader: FolderExports<TaskClass>;
    private warnedMemory = false;

    public constructor(
        host: CoreBase,
        private readonly options: TasksOptions
    ) {
        // Drain, so in-flight runs finish before database plugins disconnect
        super(host, {
            runtime: 'server',
            dispose: { phase: ShutdownPhase.Drain, ...keepDefined({ timeout: options.timeout }) }
        });

        if (options.path.length === 0) this.rejectOptions('path is empty');
        if (options.timezone !== undefined && !isTimezone(options.timezone)) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidTimezone, [
                `The ${paint.bold('timezone')} option of ${paint.bold(Tasks.id)}`,
                options.timezone
            ]);
        }

        this.runner = new TaskRunner(this.core, this.logger);
        this.cronTasks = new CronTasks(this.runner, options.timezone);
        this.scheduled = new ScheduledJobs(
            this.kv.collection<JobRecord>('job'),
            this.runner,
            (key) => this.tasks.get(key),
            this.logger
        );

        this.reloader = new FolderExports({
            dir: options.path,
            is: isTaskClass,
            register: (Task, file) => this.register(Task, file),
            unregister: (Task) => this.unregister(Task),
            logger: this.logger
        });
    }

    /**
     * Loads the task classes under `path`, then reads back the jobs earlier runs of the bot stored.
     *
     * @throws A **SeedcordTypeError** with `CoreDuplicateName` when two tasks share a key.
     * @throws A **SeedcordTypeError** when a task has an invalid cron pattern, timezone, `startAt`, or `stopAt`.
     * @throws A **SeedcordError** with `CoreKvKeysUnsupported` when the `config.kv` driver can't list its keys.
     */
    public async init(): Promise<void> {
        try {
            await this.reloader.load();
            await this.scheduled.restore();
        } catch (error) {
            // the host skips dispose for a plugin whose init rejected
            this.cronTasks.stop();
            throw error;
        }

        this.logger.info(
            `loaded ${this.tasks.size} tasks, ${this.cronTasks.size} on a cron pattern, ${this.scheduled.size} scheduled jobs`
        );
    }

    /** Starts the cron tasks and the timers for pending jobs, so a due job runs on a logged-in bot. */
    public override ready(): Promise<void> {
        this.cronTasks.start();
        this.scheduled.start();

        return Promise.resolve();
    }

    /** Stops every timer, aborts each run's `signal`, and waits for in-flight runs. Pending jobs stay stored. */
    public override async dispose(): Promise<void> {
        this.cronTasks.stop();
        this.scheduled.stop();

        await this.runner.stop();
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.reloader.handle(event);
    }

    /**
     * Stores a job that runs `Task` once, at the time `options` gives. A time in the past runs it
     * right away, or in `ready()` if the bot hasn't reached it. The promise resolves once the driver
     * holds the job, so after a restart the driver still holds any job you got an id for.
     *
     * If the process dies during a run, the job runs again after a restart. Write a task so a second
     * run of one job does no harm.
     *
     * @param Task - A class the plugin loaded from `path`.
     * @param options - `in` or `at`, plus `data` when the task declares it.
     * @throws A **SeedcordError** when the plugin did not load `Task`.
     * @throws A **SeedcordTypeError** when `in` isn't a duration or `at` isn't a date.
     * @throws A **SeedcordRangeError** when `at` is a number too small to be milliseconds, or `in` ends past the last date a `Date` can hold.
     * @throws A **SeedcordTypeError** with `CoreKvUnserializable` when `data` holds a circular reference.
     * @throws A **SeedcordError** with `CoreKvDriverFailed` when the driver can't store the job.
     * @example
     * ```ts
     * const job = await this.core.tasks.schedule(Unban, { in: '1d', data: { guildId, userId } });
     * await this.core.tasks.cancel(job.id);
     * ```
     */
    public async schedule<TTask extends ScheduledTaskClass, const TIn extends string = string>(
        Task: TTask,
        options: ScheduleOptions<DataOf<TTask>, TIn>
    ): Promise<ScheduledJob> {
        const { key } = this.requireLoaded(Task);
        const when: When = options;
        const at = resolveAt(key, when);
        // justified: ScheduleOptions rejects data JSON can't keep, and the store throws on a cycle
        const data = ('data' in options ? options.data : undefined) as JsonValue | undefined;

        this.warnIfMemory();
        return this.scheduled.add(key, at, data);
    }

    /**
     * Deletes a job so it never runs.
     *
     * @returns `false` when no job has that id, or when the job's time has come.
     * @throws A **SeedcordError** with `CoreKvDriverFailed` when the driver can't delete the job.
     */
    public async cancel(id: string): Promise<boolean> {
        return this.scheduled.cancel(id);
    }

    /** The jobs waiting to run in this process. */
    public jobs(): ScheduledJob[] {
        return this.scheduled.list();
    }

    /** Every cron task and its state. */
    public crons(): CronStatus[] {
        return this.cronTasks.list();
    }

    /**
     * When a cron task runs next, or `null` when it won't.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task` or `Task` has no cron pattern.
     */
    public nextRun(Task: CronTaskClass): Date | null {
        return this.cronTasks.nextRun(this.cronEntry(Task));
    }

    /**
     * Stops a cron task's schedule until {@link Tasks.resume}. Scheduled jobs and `trigger()` still
     * run the task. A save that reloads the task keeps it paused, and a restart forgets this.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task` or `Task` has no cron pattern.
     */
    public pause(Task: CronTaskClass): void {
        this.cronTasks.pause(this.cronEntry(Task));
    }

    /**
     * Starts a cron task that `pause()` or the `paused` option stopped.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task` or `Task` has no cron pattern.
     */
    public resume(Task: CronTaskClass): void {
        this.cronTasks.resume(this.cronEntry(Task));
    }

    /**
     * Runs a task now, outside its schedule, even while it's paused. A `protect`ed task that is
     * mid-run skips this one and calls `onOverrun()`.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task`.
     */
    public async trigger(Task: CronTaskClass): Promise<void> {
        await this.runner.run(this.requireLoaded(Task), { trigger: 'manual', jobId: null }, undefined);
    }

    // the jobs are gone by the time the process ends, so this warns while there's still time to act
    private warnIfMemory(): void {
        if (this.warnedMemory || !(this.kv.driver instanceof MemoryDriver)) return;

        this.warnedMemory = true;
        this.logger.warn(
            `scheduled jobs are kept in memory and end with this process. Pass a driver as ${paint.bold('kv')} in your config to keep them through a restart`
        );
    }

    private requireLoaded(Task: { readonly name: string }): LoadedTask {
        const key = taskKey(Task);
        const loaded = this.tasks.get(key);

        if (!loaded) throw new SeedcordError(SeedcordErrorCode.PluginTasksNotLoaded, [key, this.options.path]);
        // a class from another folder can share the key, and its data would reach the loaded class
        if (loaded.Task !== Task) {
            throw new SeedcordError(SeedcordErrorCode.PluginTasksNotLoaded, [key, this.options.path, loaded.file]);
        }

        return loaded;
    }

    private cronEntry(Task: CronTaskClass): CronEntry {
        const { key } = this.requireLoaded(Task);
        const entry = this.cronTasks.get(key);

        if (!entry) throw new SeedcordError(SeedcordErrorCode.PluginTasksPatternMissing, [key]);

        return entry;
    }

    private register(Task: TaskClass, file: string): void {
        const meta = taskMetadata(Task);
        const existing = this.tasks.get(meta.key);

        if (existing) {
            throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                'task',
                meta.key,
                [
                    `${paint.bold(existing.Task.name)} (${paint.path(existing.file)})`,
                    `${paint.bold(Task.name)} (${paint.path(file)})`
                ],
                `A task's key is its class name unless it passes a ${paint.bold('key')}.`
            ]);
        }

        const state =
            meta.kind === 'cron'
                ? this.runner.state(meta.key, meta.protect ?? true, meta.paused ?? false)
                : this.runner.state(meta.key, false, false);
        const loaded: LoadedTask = { key: meta.key, Task, file, logger: this.logger.withLabel(meta.key), state };

        if (meta.kind === 'cron') this.cronTasks.add(loaded, meta);

        this.tasks.set(meta.key, loaded);
    }

    private unregister(Task: TaskClass): void {
        const key = taskKey(Task);

        this.cronTasks.remove(key);
        this.tasks.delete(key);
    }
}
