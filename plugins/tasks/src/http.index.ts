import { Task as BaseTask } from './Task';

import type { Core } from '@seedcord/http';

export * from '.';

/** The base `Task` with `this.core` typed as an http bot's `Core`. */
export abstract class Task<TData = void> extends BaseTask<TData, Core> {}
