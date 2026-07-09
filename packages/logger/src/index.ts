export { Logger } from './Logger';
export { LoggerChannelRegistry } from './LoggerChannelRegistry';
export { ObjectConsoleSink } from './ObjectConsoleSink';

export type { ILogSink, LogLevel, LogRecord, LogSinkHandle, LoggerConfig } from './types';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
