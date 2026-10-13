import { format } from 'node:util';

import { LoggerChannelRegistry } from '@seedcord/logger';

import type { LogLevel } from '@seedcord/types';

const LEVEL_OF: Record<string, LogLevel> = {
    log: 'info',
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug'
};

function toRecord(level: LogLevel): (...args: unknown[]) => void {
    return (...args) => {
        LoggerChannelRegistry.instance.dispatch({
            level,
            message: format(...args),
            label: 'Console',
            channel: 'default',
            timestamp: Date.now()
        });
    };
}

// sends wrangler's and a bot's own console calls to the log list and the log file
// ink's alternate screen shows none of them
export function routeConsoleToLogs(): () => void {
    const originals = Object.getOwnPropertyDescriptors(console);
    for (const [method, level] of Object.entries(LEVEL_OF)) {
        Object.defineProperty(console, method, { configurable: true, writable: true, value: toRecord(level) });
    }

    return () => {
        for (const method of Object.keys(LEVEL_OF)) {
            const original = originals[method];
            if (original) Object.defineProperty(console, method, original);
        }
    };
}
