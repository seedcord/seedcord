import { Task } from '#src/Task';

import type { CronPattern } from '#src/types/CronPattern';
import type { TaskContext, TaskOptions } from '#src/types/Tasks';
import type { Exact } from 'type-fest';

export type TaskClass = new (context: TaskContext) => Task<unknown>;
export type NoDataTaskClass = abstract new (context: TaskContext<void>) => Task;
export type ScheduledTaskClass = abstract new (context: never) => Task<unknown>;

type ScheduledOptions = Pick<TaskOptions, 'key' | 'runInDev'>;

// makes @RegisterTask({ key, protect }) an error. TypeScript doesn't check for extra keys on a generic argument
type RegisterArgs<TArg, TZone extends string, TEvery extends string> = TArg extends string
    ? [pattern: CronPattern<TArg>, options?: TaskOptions<TZone, TEvery>]
    : [options?: Exact<ScheduledOptions, TArg>];
type TaskTarget<TArg> = TArg extends string ? NoDataTaskClass : ScheduledTaskClass;

export type TaskMetadata =
    | (Omit<TaskOptions, 'key' | 'protect'> & { kind: 'cron'; key: string; pattern: string; protect: boolean })
    | (Omit<ScheduledOptions, 'key'> & { kind: 'scheduled'; key: string; protect: false });

const registry = new WeakMap<object, TaskMetadata>();

/**
 * Marks a class as a task. With a cron pattern it runs on that schedule. Without one it runs when
 * code calls `schedule()`.
 *
 * A literal pattern, timezone, or `every` with a mistake in it fails to compile. A cron job can't declare
 * data, since nothing passes it any.
 *
 * @param pattern - 5, 6, or 7 fields in croner's grammar, or a nickname like `@daily`.
 * @example
 * ```ts
 * \@RegisterTask('0 9 * * *', { timezone: 'America/New_York' })
 * export class DailyDigest extends Task {
 *     public async execute(): Promise<void> {}
 * }
 * ```
 */
export function RegisterTask<
    const TArg extends string | ScheduledOptions = ScheduledOptions,
    const TZone extends string = string,
    const TEvery extends string = string
>(...args: RegisterArgs<TArg, TZone, TEvery>): (target: TaskTarget<TArg>) => void;

export function RegisterTask(patternOrOptions: string | ScheduledOptions = {}, options: TaskOptions = {}) {
    return (target: { readonly name: string }): void => {
        const metadata: TaskMetadata =
            typeof patternOrOptions === 'string'
                ? {
                      ...options,
                      kind: 'cron',
                      key: options.key ?? target.name,
                      pattern: patternOrOptions,
                      protect: options.protect ?? true
                  }
                : {
                      ...patternOrOptions,
                      kind: 'scheduled',
                      key: patternOrOptions.key ?? target.name,
                      protect: false
                  };

        registry.set(target, metadata);
    };
}

export const isTaskClass = (value: unknown): value is TaskClass =>
    typeof value === 'function' && value.prototype instanceof Task && registry.has(value);

// justified: a TaskClass only comes out of isTaskClass, which checked the registry holds it
export const taskMetadata = (Task: TaskClass): TaskMetadata => registry.get(Task) as TaskMetadata;

export function taskKey(target: { readonly name: string }): string {
    return registry.get(target)?.key ?? target.name;
}
