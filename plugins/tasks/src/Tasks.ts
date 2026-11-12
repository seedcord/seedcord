import { MemoryDriver, ShutdownPhase } from '@seedcord/core';
import { FolderExports, Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';
import { pluralize } from '@seedcord/utils/internal';

import { CronTasks } from './CronTasks';
import { isTaskClass, taskKey, taskMetadata } from './decorators/RegisterTask';
import { isTimezone } from './isTimezone';
import { NOT_A_TIMEZONE } from './requireTimezone';
import { resolveAt } from './resolveAt';
import { ScheduledJobs } from './ScheduledJobs';
import { TaskRegistry } from './TaskRegistry';
import { TaskRunner } from './TaskRunner';

import type { NoDataTaskClass, ScheduledTaskClass, TaskClass } from './decorators/RegisterTask';
import type { JobRecord } from './ScheduledJobs';
import type { CronSlot, LoadedTask } from './TaskRegistry';
import type { CronStatus, ScheduledJob, ScheduleOptions, TaskContext, TasksOptions, When } from './types/Tasks';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/core/plugin';
import type { JsonValue } from 'type-fest';

type DataOf<TTask> = TTask extends abstract new (context: TaskContext<infer TData>) => unknown ? TData : never;

/**
 * Runs the task classes in a folder. A task with a cron pattern runs on that schedule. Any task can
 * also run once at a later time through {@link Tasks.schedule}.
 *
 * The plugin stores scheduled tasks in the bot's `config.kv`, under its attach key. With a driver that
 * keeps its records, a pending job is still there after a restart. A job whose time passed while the
 * bot was down runs as soon as the bot starts. Renaming the attach key leaves the old key's
 * jobs behind.
 *
 * @example
 * ```ts
 * seedcord.attach('tasks', Tasks, { path: './tasks', timezone: 'UTC' });
 * ```
 */
export class Tasks extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    public static readonly id = '@seedcord/plugin-tasks';

    readonly #registry = new TaskRegistry();
    readonly #runner: TaskRunner;
    readonly #cronTasks: CronTasks;
    readonly #scheduled: ScheduledJobs;
    readonly #reloader: FolderExports<TaskClass>;
    readonly #path: string;
    public constructor(host: CoreBase, options: TasksOptions) {
        // Drain lets in-flight runs finish before database plugins disconnect
        super(host, {
            runtime: 'server',
            dispose: { phase: ShutdownPhase.Drain, ...keepDefined({ timeout: options.timeout }) }
        });

        if (options.path.length === 0) {
            this.rejectOptions(
                `${paint.bold('path')} is empty. Pass the folder that holds your task classes, like ${paint.sky("'./tasks'")}`
            );
        }
        if (options.timezone !== undefined && !isTimezone(options.timezone)) {
            this.rejectOptions(`${paint.bold('timezone')} is ${paint.sky(`'${options.timezone}'`)}. ${NOT_A_TIMEZONE}`);
        }

        this.#path = options.path;
        this.#runner = new TaskRunner(this.core, this.logger);
        this.#cronTasks = new CronTasks(this.#registry, this.#runner, options.timezone);
        this.#scheduled = new ScheduledJobs(
            this.kv.collection<JobRecord>('job'),
            this.#runner,
            (key) => this.#registry.loaded(key),
            this.logger,
            this.kv.driver instanceof MemoryDriver
        );

        this.#reloader = new FolderExports({
            dir: options.path,
            is: isTaskClass,
            register: (Task, file) => this.#register(Task, file),
            unregister: (Task) => this.#unregister(Task),
            logger: this.logger
        });
    }

    /**
     * Loads the task classes under `path`, then reads back the jobs that earlier runs of the bot stored.
     *
     * @throws A **SeedcordError** when a task file throws while it imports.
     * @throws A **SeedcordTypeError** with `CoreDuplicateName` when two tasks share a key.
     * @throws A **SeedcordTypeError** with `PluginTasksInvalidPattern` when croner can't parse a task's cron pattern.
     * @throws A **SeedcordTypeError** with `PluginTasksInvalidOption` when a task's pattern is a date.
     * @throws A **SeedcordTypeError** with `PluginTasksInvalidOption` when a task's `timezone` isn't one `Intl` supports.
     * @throws A **SeedcordTypeError** with `PluginTasksInvalidOption` when croner can't read a task's `startAt` or `stopAt`.
     * @throws A **SeedcordTypeError** with `PluginTasksInvalidOption` when a task's `stopAt` isn't after its `startAt`.
     * @throws A **SeedcordRangeError** with `PluginTasksInvalidOption` when a task's `maxRuns` isn't a whole number of 1 or more.
     * @throws A **SeedcordRangeError** with `PluginTasksInvalidOption` when a task's `every` isn't whole seconds.
     * @throws A **SeedcordTypeError** with `InvalidDuration` when a task's `every` isn't a duration.
     * @throws A **SeedcordError** with `CoreKvKeysUnsupported` when the `config.kv` driver can't list its keys.
     */
    public async init(): Promise<void> {
        await this.#reloader.load();
        await this.#scheduled.restore();

        const tasks = this.#registry.size;
        const jobs = this.#scheduled.size;
        this.logger.info(
            `loaded ${tasks} ${pluralize(tasks, 'task')}, ${this.#cronTasks.size} on a cron pattern, ${jobs} scheduled ${pluralize(jobs, 'job')}`
        );
    }

    /** Starts the cron jobs and the timers for pending jobs once the bot has logged in. */
    public override ready(): void {
        this.#cronTasks.start();
        this.#scheduled.start();
    }

    /** Stops every timer, aborts each run's `signal`, and waits for in-flight runs. The driver still holds pending jobs. */
    public override async dispose(): Promise<void> {
        this.#cronTasks.stop();
        this.#scheduled.stop();

        await this.#runner.stop();
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.#reloader.handle(event);
    }

    /**
     * Stores a job that runs `Task` once, at the time `options` gives. If that time has passed, the job
     * runs right away, or in `ready()` if the bot hasn't logged in yet. Once the promise resolves, the
     * driver holds the job, and it's still there after a restart.
     *
     * If the process dies during a run, the job runs again after a restart. Write a task so a second
     * run of one job is safe.
     *
     * @param Task - A class that the plugin loaded from `path`.
     * @param options - `in` or `at`, plus `data` when the task declares it.
     * @throws A **SeedcordError** with `PluginTasksNotLoaded` when the plugin did not load `Task`.
     * @throws A **SeedcordTypeError** with `PluginTasksKeyTaken` when a different class loaded under `Task`'s key.
     * @throws A **SeedcordTypeError** with `InvalidDuration` when `in` isn't a duration.
     * @throws A **SeedcordTypeError** with `PluginTasksInvalidOption` when `at` isn't a date.
     * @throws A **SeedcordRangeError** with `PluginTasksAtTooEarly` when `at` is a number too small to be milliseconds.
     * @throws A **SeedcordRangeError** with `PluginTasksDurationTooLong` when `in` ends past the last date a `Date` can hold.
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
        const { key } = this.#requireLoaded(Task);
        const when: When = options;
        const at = resolveAt(key, when);
        // justified: ScheduleOptions rejects data that JSON can't keep, and the store throws on a cycle
        const data = ('data' in options ? options.data : undefined) as JsonValue | undefined;

        return this.#scheduled.add(key, at, data);
    }

    /**
     * Deletes a job so it never runs.
     *
     * @returns `false` if the id doesn't match a job, or if the job's run has started.
     * @throws A **SeedcordError** with `CoreKvDriverFailed` when the driver can't read or delete the job.
     */
    public async cancel(id: string): Promise<boolean> {
        return this.#scheduled.cancel(id);
    }

    /** The jobs waiting to run in this process. */
    public jobs(): ScheduledJob[] {
        return this.#scheduled.list();
    }

    /** Every cron job and its state. */
    public crons(): CronStatus[] {
        return this.#cronTasks.list();
    }

    /**
     * When a cron job runs next, or `null` while it's paused or once it doesn't have any runs left.
     *
     * @throws A **SeedcordError** with `PluginTasksNotLoaded` when the plugin did not load `Task`.
     * @throws A **SeedcordTypeError** with `PluginTasksKeyTaken` when a different class loaded under `Task`'s key.
     * @throws A **SeedcordTypeError** with `PluginTasksPatternMissing` when `Task` doesn't have a cron pattern.
     */
    public nextRun(Task: NoDataTaskClass): Date | null {
        return this.#cronTasks.nextRun(this.#cronSlot(Task));
    }

    /**
     * Stops a cron job's schedule until {@link Tasks.resume}. Scheduled tasks and `trigger()` still
     * run the task. The task is still paused after a save reloads it. After a restart, it
     * follows its `paused` option again.
     *
     * @throws A **SeedcordError** with `PluginTasksNotLoaded` when the plugin did not load `Task`.
     * @throws A **SeedcordTypeError** with `PluginTasksKeyTaken` when a different class loaded under `Task`'s key.
     * @throws A **SeedcordTypeError** with `PluginTasksPatternMissing` when `Task` doesn't have a cron pattern.
     */
    public pause(Task: NoDataTaskClass): void {
        this.#cronTasks.pause(this.#cronSlot(Task));
    }

    /**
     * Starts a cron job that `pause()` or the `paused` option stopped. It runs at its next match and skips the
     * ones it missed.
     *
     * @throws A **SeedcordError** with `PluginTasksNotLoaded` when the plugin did not load `Task`.
     * @throws A **SeedcordTypeError** with `PluginTasksKeyTaken` when a different class loaded under `Task`'s key.
     * @throws A **SeedcordTypeError** with `PluginTasksPatternMissing` when `Task` doesn't have a cron pattern.
     */
    public resume(Task: NoDataTaskClass): void {
        this.#cronTasks.resume(this.#cronSlot(Task));
    }

    /**
     * Runs a task now, outside its schedule, even while it's paused. If a `protect`ed task is
     * mid-run, it skips this run and calls `onOverrun()`.
     *
     * @throws A **SeedcordError** with `PluginTasksNotLoaded` when the plugin did not load `Task`.
     * @throws A **SeedcordTypeError** with `PluginTasksKeyTaken` when a different class loaded under `Task`'s key.
     */
    public async trigger(Task: NoDataTaskClass): Promise<void> {
        await this.#runner.run(this.#requireLoaded(Task), { trigger: 'manual', jobId: null }, undefined);
    }

    #requireLoaded(Task: { readonly name: string }): LoadedTask {
        const key = taskKey(Task);
        const loaded = this.#registry.loaded(key);

        if (!loaded) throw new SeedcordError(SeedcordErrorCode.PluginTasksNotLoaded, [key, this.#path]);
        // a class from another folder can share the key. Its data would then reach the loaded class
        if (loaded.Task !== Task) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksKeyTaken, [key, loaded.file]);
        }

        return loaded;
    }

    #cronSlot(Task: NoDataTaskClass): CronSlot {
        const { key } = this.#requireLoaded(Task);
        const slot = this.#registry.cronSlot(key);

        if (!slot) throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksPatternMissing, [key]);

        return slot;
    }

    #register(Task: TaskClass, file: string): void {
        const meta = taskMetadata(Task);
        const slot = this.#registry.slot(meta.key);
        const existing = slot.loaded;

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

        const loaded: LoadedTask = {
            key: meta.key,
            Task,
            file,
            logger: this.logger.withLabel(meta.key),
            protect: meta.protect,
            state: slot.state
        };

        slot.load(loaded, meta.kind === 'cron' ? this.#cronTasks.build(loaded, meta) : undefined);
        this.#cronTasks.sync(slot);
    }

    #unregister(Task: TaskClass): void {
        this.#registry.slot(taskKey(Task)).unload();
    }
}
