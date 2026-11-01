import type { Task } from '#src/Task';
import type { CronPattern } from '#src/types/CronPattern';
import type { TaskContext, TaskOptions } from '#src/types/Tasks';

export type TaskClass = new (context: TaskContext) => Task<unknown>;

export interface TaskMetadata extends Omit<TaskOptions, 'key'> {
    key: string;
    pattern: string | undefined;
}

const registry = new WeakMap<object, TaskMetadata>();

/**
 * Marks a class as a task. With a cron pattern it runs on that schedule. Without one it runs when
 * code calls `schedule()`.
 *
 * A literal pattern or timezone with a mistake in it fails to compile. A cron task can't declare
 * data, since nothing passes it any.
 *
 * @param pattern - 5, 6, or 7 fields in croner's grammar, or a nickname like `@daily`.
 * @param options - See {@link TaskOptions}.
 * @example
 * ```ts
 * \@RegisterTask('0 9 * * *', { timezone: 'Europe/Sarajevo' })
 * export class DailyDigest extends Task {
 *     public async execute(): Promise<void> {}
 * }
 * ```
 */
export function RegisterTask<const TPattern extends string, const TZone extends string = string>(
    pattern: CronPattern<TPattern>,
    options?: TaskOptions<TZone>
): (target: abstract new (context: TaskContext<void>) => Task) => void;

export function RegisterTask(
    options?: Pick<TaskOptions, 'key'>
): (target: abstract new (context: never) => Task<unknown>) => void;

export function RegisterTask(patternOrOptions: string | Pick<TaskOptions, 'key'> = {}, options: TaskOptions = {}) {
    return (target: { readonly name: string }): void => {
        const metadata: TaskMetadata =
            typeof patternOrOptions === 'string'
                ? { ...options, key: options.key ?? target.name, pattern: patternOrOptions }
                : { key: patternOrOptions.key ?? target.name, pattern: undefined };

        registry.set(target, metadata);
    };
}

export function taskMetadata(target: object): TaskMetadata | undefined {
    return registry.get(target);
}

export function taskKey(target: { readonly name: string }): string {
    return taskMetadata(target)?.key ?? target.name;
}
