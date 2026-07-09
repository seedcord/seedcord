import { Envapter } from 'envapt';

import type { LogLevel } from './types';

// rank per level, error is highest
const LEVEL_RANK: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
};

export const DEFAULT_CHANNEL = 'default';

/** The environment-derived floor when no level is configured. */
export function defaultLevel(): LogLevel {
    if (Envapter.isDevelopment) return 'trace';
    if (Envapter.isStaging) return 'debug';
    return 'info';
}

export function passesLevel(recordLevel: LogLevel, floor: LogLevel): boolean {
    return LEVEL_RANK[recordLevel] <= LEVEL_RANK[floor];
}
