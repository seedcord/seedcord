import { Envapter } from 'envapt';

import type { LogLevel } from '@seedcord/types';

// error is the most severe, at rank 0
const LEVEL_RANK: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
};

export const DEFAULT_CHANNEL = 'default';

// the floor LoggerChannelRegistry falls back to when config sets no level
export function defaultLevel(): LogLevel {
    if (Envapter.isDevelopment) return 'trace';
    if (Envapter.isStaging) return 'debug';
    return 'info';
}

export function passesLevel(recordLevel: LogLevel, floor: LogLevel): boolean {
    return LEVEL_RANK[recordLevel] <= LEVEL_RANK[floor];
}
