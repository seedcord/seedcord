import { MemoryDriver, ShutdownPhase } from '@seedcord/core';
import { HmrModuleHandler } from '@seedcord/core/hmr';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { importFiles, keepDefined } from '@seedcord/utils';

import { CronTasks } from './CronTasks';
import { taskKey, taskMetadata } from './decorators/RegisterTask';
import { isTimezone, resolveAt, toJson } from './schedule';
import { ScheduledJobs } from './ScheduledJobs';
import { Task } from './Task';
import { TaskRunner } from './TaskRunner';

import type { TaskClass } from './decorators/RegisterTask';
import type { JobRecord } from './ScheduledJobs';
import type { Registered } from './TaskRunner';
import type { CronStatus, ScheduledJob, ScheduleOptions, TaskContext, TasksOptions, When } from './types/Tasks';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/core/plugin';

type AnyTaskClass = abstract new (context: never) => Task<unknown>;
type VoidTaskClass = abstract new (context: TaskContext<void>) => Task;
type DataOf<TTask> = TTask extends abstract new (context: TaskContext<infer TData>) => unknown ? TData : never;

const isTaskClass = (value: unknown): value is TaskClass =>
    typeof value === 'function' && value.prototype instanceof Task && taskMetadata(value) !== undefined;

/**
 * Runs the task classes in a folder. A task with a cron pattern runs on that schedule. Any task can
 * also run once at a later time through {@link Tasks.schedule}.
 *
 * Scheduled jobs live in the bot's `config.kv`, under this plugin's attach key. With a driver that
 * keeps its records, a pending job survives a restart, and one that came due while the bot was down
 * runs as soon as it starts. Renaming the attach key leaves the old key's jobs behind.
 *
 * @example
 * ```ts
 * seedcord.attach('tasks', Tasks, { path: './tasks', timezone: 'UTC' });
 * ```
 */
export class Tasks extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    public static readonly id = '@seedcord/plugin-tasks';

    private readonly tasks = new Map<string, Registered>();
    private readonly runner: TaskRunner;
    private readonly crons: CronTasks;
    private readonly scheduled: ScheduledJobs;
    private readonly reloader: HmrModuleHandler<TaskClass, void, string>;

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
            this.rejectOptions(`timezone '${options.timezone}' is not an IANA timezone`);
        }

        this.runner = new TaskRunner(this.core, this.logger);
        this.crons = new CronTasks(this.runner, this.logger, options.timezone);
        this.scheduled = new ScheduledJobs(
            this.kv.collection<JobRecord>('job'),
            this.runner,
            (key) => this.tasks.get(key),
            this.logger
        );

        this.reloader = new HmrModuleHandler<TaskClass, void, string>({
            handlersDir: options.path,
            isHandler: isTaskClass,
            registerHandler: (Task, file) => this.register(Task, file),
            getArtifacts: (Task) => taskKey(Task),
            unregisterHandler: (_Task, key) => this.unregister(key),
            logger: this.logger
        });
    }

    /**
     * Loads the task classes under `path`, then reads back the jobs earlier runs of the bot stored.
     *
     * @throws A **SeedcordError** when two tasks share a key.
     * @throws A **SeedcordTypeError** when a task has an invalid cron pattern or timezone.
     * @throws A **SeedcordError** with `CoreKvKeysUnsupported` when the `config.kv` driver can't list its keys.
     */
    public async init(): Promise<void> {
        try {
            await this.loadTasks();
            await this.scheduled.restore();
        } catch (error) {
            // the host skips dispose for a plugin whose init rejected
            this.crons.stop();
            throw error;
        }

        this.logger.info(
            `loaded ${this.tasks.size} tasks, ${this.crons.size} on a cron pattern, ${this.scheduled.size} scheduled jobs`
        );
    }

    /** Starts the cron tasks and the timers for pending jobs, so a due job runs on a logged-in bot. */
    public override ready(): Promise<void> {
        this.crons.start();
        this.scheduled.start();

        return Promise.resolve();
    }

    /** Stops every timer, aborts each run's `signal`, and waits for in-flight runs. Pending jobs stay stored. */
    public override async dispose(): Promise<void> {
        if (this.scheduled.size > 0 && this.kv.driver instanceof MemoryDriver) {
            this.logger.warn(
                `${this.scheduled.size} scheduled jobs end with this process. Pass a driver as ${paint.bold('kv')} in your config to keep them through a restart`
            );
        }

        this.crons.stop();
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
     * holds the job, so a job you got an id for survives a restart.
     *
     * If the process dies during a run, the job runs again after a restart. Write a task so a second
     * run of one job does no harm.
     *
     * @param Task - A class the plugin loaded from `path`.
     * @param options - `in` or `at`, plus `data` when the task declares it.
     * @throws A **SeedcordError** when the plugin did not load `Task`.
     * @throws A **SeedcordTypeError** when `in` isn't a duration or `at` isn't a date.
     * @throws A **SeedcordRangeError** when `at` is a number too small to be milliseconds.
     * @throws A **SeedcordTypeError** when `data` has no JSON form.
     * @throws A **SeedcordError** with `CoreKvDriverFailed` when the driver can't store the job.
     * @example
     * ```ts
     * const job = await this.core.tasks.schedule(Unban, { in: '1d', data: { guildId, userId } });
     * await this.core.tasks.cancel(job.id);
     * ```
     */
    public async schedule<TTask extends AnyTaskClass, const TIn extends string = string>(
        Task: TTask,
        options: ScheduleOptions<DataOf<TTask>, TIn>
    ): Promise<ScheduledJob> {
        const { key } = this.registered(Task);
        const when: When = options;
        const at = resolveAt(key, when);
        const data: unknown = 'data' in options ? options.data : undefined;

        return this.scheduled.add(key, at, data === undefined ? undefined : toJson(key, data));
    }

    /**
     * Deletes a job so it never runs.
     *
     * @returns `false` when no job has that id, or when the job has already started.
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
    public list(): CronStatus[] {
        return this.crons.list();
    }

    /**
     * When a cron task runs next, or `null` when it won't.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task` or `Task` has no cron pattern.
     */
    public nextRun(Task: VoidTaskClass): Date | null {
        return this.crons.nextRun(this.cronKey(Task));
    }

    /**
     * Stops a cron task from firing until {@link Tasks.resume}. A restart forgets this.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task` or `Task` has no cron pattern.
     */
    public pause(Task: VoidTaskClass): void {
        this.crons.pause(this.cronKey(Task));
    }

    /**
     * Starts a cron task that `pause()` or the `paused` option stopped.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task` or `Task` has no cron pattern.
     */
    public resume(Task: VoidTaskClass): void {
        this.crons.resume(this.cronKey(Task));
    }

    /**
     * Runs a task now, outside its schedule. A `protect`ed cron task that is mid-run skips this one.
     *
     * @throws A **SeedcordError** when the plugin did not load `Task`.
     */
    public async trigger(Task: VoidTaskClass): Promise<void> {
        const registered = this.registered(Task);

        if (this.crons.has(registered.key)) await this.crons.run(registered.key, 'manual');
        else await this.runner.run(registered, 'manual', undefined, null);
    }

    private async loadTasks(): Promise<void> {
        for await (const { fullPath, relativePath, imported } of importFiles(this.options.path)) {
            for (const Task of Object.values(imported).filter(isTaskClass)) {
                this.register(Task, relativePath);
                this.reloader.trackHandler(fullPath, Task);
            }
        }
    }

    private registered(Task: { readonly name: string }): Registered {
        const key = taskKey(Task);
        const registered = this.tasks.get(key);

        if (!registered) throw new SeedcordError(SeedcordErrorCode.PluginTasksNotLoaded, [key, this.options.path]);

        return registered;
    }

    private cronKey(Task: VoidTaskClass): string {
        const { key } = this.registered(Task);

        if (!this.crons.has(key)) throw new SeedcordError(SeedcordErrorCode.PluginTasksPatternMissing, [key]);

        return key;
    }

    private register(Task: TaskClass, file: string): void {
        const meta = taskMetadata(Task);
        if (!meta) return;

        const { key } = meta;
        const existing = this.tasks.get(key);

        // a file that exports one class twice reaches this loop twice
        if (existing?.Task === Task) return;
        if (existing) throw new SeedcordError(SeedcordErrorCode.PluginTasksDuplicateKey, [key, file]);

        const registered: Registered = { key, Task, logger: this.logger.withLabel(key) };

        if (meta.pattern !== undefined) this.crons.add(registered, meta, meta.pattern, file);

        this.tasks.set(key, registered);
        this.logger.debug(`registered ${paint.sky(key)} from ${paint.path(file)}`);
    }

    private unregister(key: string | undefined): void {
        if (key === undefined) return;

        this.crons.remove(key);
        this.tasks.delete(key);
    }
}
