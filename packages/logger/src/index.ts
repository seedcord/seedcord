export { FRAMEWORK_CHANNELS } from './channels';
export { Logger } from './Logger';
export { LoggerChannelRegistry } from './LoggerChannelRegistry';
export { ObjectConsoleSink } from './ObjectConsoleSink';
export { paint } from '@seedcord/errors/internal';
export { LEVEL_COLOR } from './palette';

export type {
    FrameworkChannel,
    ILogSink,
    LogLevel,
    LogRecord,
    LoggerChannelId,
    LogSinkHandle,
    LoggerConfig,
    LoggerOptions
} from './types';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
