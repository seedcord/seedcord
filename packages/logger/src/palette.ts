import type { LogLevel } from './types';

// truecolor because a terminal theme remaps chalk's 16-color names (blue turns orange in monokai)
export const LEVEL_COLOR: Record<LogLevel, string> = {
    error: '#ff6b85',
    warn: '#ffc061',
    info: '#66d98a',
    debug: '#66b3ff',
    trace: '#b399e6'
};
