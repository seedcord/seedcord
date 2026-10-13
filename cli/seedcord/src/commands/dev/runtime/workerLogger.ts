import { LoggerChannelRegistry } from '@seedcord/logger';
import { createLogger } from 'vite';

import type { LogLevel } from '@seedcord/types';
import type { Logger } from 'vite';

// miniflare writes the worker's console output through vite's logger
export function workerLogger(): Logger {
    const logger = createLogger();
    const forward =
        (level: LogLevel) =>
        (message: string): void => {
            LoggerChannelRegistry.instance.dispatch({
                level,
                message,
                label: 'Worker',
                channel: 'bot',
                timestamp: Date.now()
            });
        };
    logger.info = forward('info');
    logger.warn = forward('warn');
    logger.warnOnce = forward('warn');
    logger.error = forward('error');
    return logger;
}
