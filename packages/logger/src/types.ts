export type { ILogSink, LogLevel, LogRecord, LogSinkHandle, LoggerConfig } from '@seedcord/types/internal';

/** Options for a {@link Logger} instance. */
export interface LoggerOptions {
    /** @defaultValue `'default'` */
    channel?: string;
}
