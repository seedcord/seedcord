import { Task as BaseTask } from './Task';

import type { Core } from '@seedcord/gateway';

export * from '.';

/** The base `Task` with `this.core` typed as a gateway bot's `Core`. */
export abstract class Task<TData = void> extends BaseTask<TData, Core> {}
