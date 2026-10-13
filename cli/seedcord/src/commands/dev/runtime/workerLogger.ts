import { createLogger } from 'vite';

import type { LogLevel, LogRecord } from '@seedcord/types';
import type { Logger } from 'vite';

// miniflare writes the worker's console output through vite's logger
export function workerLogger(onLog: (record: LogRecord) => void): Logger {
    const logger = createLogger();
    const forward =
        (level: LogLevel) =>
        (message: string): void => {
            onLog({ level, message, label: 'Worker', channel: 'bot', timestamp: Date.now() });
        };
    logger.info = forward('info');
    logger.warn = forward('warn');
    logger.warnOnce = forward('warn');
    logger.error = forward('error');
    return logger;
}
