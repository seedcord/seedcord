import chalk from 'chalk';

import type { LogLevel } from './types';

// level colors, one source for the TUI chips and any level-tinted text. truecolor renders the same in every
// terminal theme, and a theme remaps chalk's 16-color names (blue turns orange in monokai).
export const LEVEL_COLOR: Record<LogLevel, string> = {
    error: '#ff6b85',
    warn: '#ffc061',
    info: '#66d98a',
    debug: '#66b3ff',
    trace: '#b399e6'
};

// truecolor chainable chalk methods
export const paint = {
    sky: chalk.hex('#8fc7ff'),
    iris: chalk.hex('#e29bff'),
    mint: chalk.hex('#66d98a'),
    amber: chalk.hex('#ffc061'),
    coral: chalk.hex('#ff6b85'),
    mute: chalk.dim
} as const;
