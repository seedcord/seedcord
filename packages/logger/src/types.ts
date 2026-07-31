import type { LoggerChannelId } from '@seedcord/types/internal';

export type {
    FrameworkChannel,
    ILogSink,
    LogLevel,
    LogRecord,
    LoggerChannelId,
    LogSinkHandle,
    LoggerConfig
} from '@seedcord/types/internal';

/** Options for a {@link Logger} instance. */
export interface LoggerOptions {
    /** @defaultValue `'default'` */
    channel?: LoggerChannelId | undefined;
}
