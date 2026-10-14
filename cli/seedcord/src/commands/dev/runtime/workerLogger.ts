import { fromDevLogLine } from '@seedcord/core/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { createLogger } from 'vite';

import type { LogLevel, LogRecord } from '@seedcord/types';
import type { LogErrorOptions, Logger } from 'vite';

function workerRecord(level: LogLevel, message: string, options?: LogErrorOptions): LogRecord {
    const record: LogRecord = { level, message, label: 'Worker', channel: 'bot', timestamp: Date.now() };
    if (options?.error) record.args = [options.error];
    return record;
}

// miniflare writes the worker's console output through vite's logger
export function workerLogger(): Logger {
    const logger = createLogger();
    const warned = new Set<string>();
    const forward =
        (level: LogLevel) =>
        (message: string, options?: LogErrorOptions): void => {
            // a line forwardLogsToCli wrote carries a bot log record, already filtered by the worker's level
            LoggerChannelRegistry.instance.dispatch(fromDevLogLine(message) ?? workerRecord(level, message, options));
        };
    logger.info = forward('info');
    logger.warn = forward('warn');
    logger.warnOnce = (message, options) => {
        if (warned.has(message)) return;
        warned.add(message);
        logger.warn(message, options);
    };
    logger.error = forward('error');
    return logger;
}
