import { LEVEL_COLOR } from '@seedcord/logger';
import chalk from 'chalk';

import type { LogLevel } from '@seedcord/types';

const LEVEL_MARK: Record<LogLevel, string> = { error: '⬢', warn: '▲', info: '●', debug: '◆', trace: '·' };

export function levelMark(level: LogLevel): string {
    return chalk.hex(LEVEL_COLOR[level])(LEVEL_MARK[level]);
}
