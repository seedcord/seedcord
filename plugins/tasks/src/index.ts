export { Task } from './Task';
export { Tasks } from './Tasks';

export { RegisterTask } from './decorators/RegisterTask';

export type * from './types/Tasks';
export type { CronNickname, CronPattern } from './types/CronPattern';
export type { Duration } from './types/Duration';
export type { IanaTimezone, Timezone } from './types/Timezone';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
