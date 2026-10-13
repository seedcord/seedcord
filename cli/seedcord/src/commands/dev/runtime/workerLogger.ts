import { fromDevLogLine } from '@seedcord/core/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { createLogger } from 'vite';

import type { LogLevel, LogRecord } from '@seedcord/types';
import type { Logger } from 'vite';

function workerRecord(level: LogLevel, message: string): LogRecord {
    return { level, message, label: 'Worker', channel: 'bot', timestamp: Date.now() };
}

// miniflare writes the worker's console output through vite's logger
// a line DevLogForwarder wrote carries a bot log record, already filtered by the worker's level
export function workerLogger(): Logger {
    const logger = createLogger();
    const forward =
        (level: LogLevel) =>
        (message: string): void => {
            LoggerChannelRegistry.instance.dispatch(fromDevLogLine(message) ?? workerRecord(level, message));
        };
    logger.info = forward('info');
    logger.warn = forward('warn');
    logger.warnOnce = forward('warn');
    logger.error = forward('error');
    return logger;
}
