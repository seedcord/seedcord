import type { TaskContext, TaskData, TaskTrigger } from './types/Tasks';
import type { CoreBase } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';

/**
 * Base class for a task. A field doesn't keep its value between runs, since each run gets a fresh
 * instance.
 *
 * Import it from `@seedcord/plugin-tasks/gateway` or `/http` to type `this.core` as your bot's `Core`.
 *
 * @typeParam TData - The payload `schedule()` passes. A cron task takes none.
 * @typeParam TCore - The `Core` that `this.core` has. The transport subpaths set it.
 * @example
 * ```ts
 * \@RegisterTask()
 * export class Unban extends Task<{ guildId: string; userId: string }> {
 *     public async execute(): Promise<void> {
 *         const { guildId, userId } = this.data;
 *         await this.core.rest.delete(Routes.guildBan(guildId, userId));
 *     }
 * }
 * ```
 */
export abstract class Task<TData = void, TCore extends CoreBase = CoreBase> {
    /** The task's key, from `@RegisterTask` or the class name. */
    public readonly key: string;
    protected readonly core: TCore;
    /** Logs under the task's key, on the channel of the plugin's attach key. */
    protected readonly logger: Logger;
    /** The scheduled payload after its trip through the store. */
    protected readonly data: TaskData<TData>;
    /** Aborts when the bot shuts down. Pass it to anything slow. */
    protected readonly signal: AbortSignal;
    protected readonly startedAt: Date;
    protected readonly trigger: TaskTrigger;

    public constructor(context: TaskContext<TData>) {
        this.key = context.key;
        // justified: the transport subpaths bind TCore to the Core their bot passes
        this.core = context.core as TCore;
        this.logger = context.logger;
        this.data = context.data;
        this.signal = context.signal;
        this.startedAt = context.startedAt;
        this.trigger = context.trigger;
    }

    /** The task's work. The plugin logs a throw, publishes it as a failed `taskRan`, and passes it to `onError()`. */
    public abstract execute(): Promise<void>;

    /** Runs after `execute()` throws, once the plugin has logged the error. If `execute()` throws after shutdown aborted `signal`, the plugin skips this. */
    public onError?(error: Error): Promise<void>;

    /** Runs in place of `execute()` when a `protect`ed task gets a cron or manual run before its previous run has finished. */
    public onOverrun?(): Promise<void>;
}
