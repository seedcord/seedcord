export { Task } from './Task';
export { Tasks } from './Tasks';

export { RegisterTask } from './decorators/RegisterTask';

export type {
    CronStatus,
    ScheduledJob,
    ScheduleOptions,
    TaskContext,
    TaskData,
    TaskOptions,
    TasksOptions,
    TaskTrigger
} from './types/Tasks';
export type { CronPattern } from './types/CronPattern';
export type { IanaTimezone, Timezone } from './types/Timezone';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
