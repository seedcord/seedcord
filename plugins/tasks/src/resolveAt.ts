import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { parseDuration } from '@seedcord/utils';

import type { When } from './types/Tasks';

// 2000-01-01 in ms. A smaller number is almost always a timestamp in seconds
const MIN_EPOCH_MS = 946_684_800_000;

function parseIn(key: string, duration: string): number {
    const ms = parseDuration(duration);
    if (ms === null) {
        throw new SeedcordTypeError(SeedcordErrorCode.InvalidDuration, [
            `${paint.bold('schedule()')} for ${paint.sky(key)}`,
            duration
        ]);
    }
    return ms;
}

function parseAt(key: string, at: Date | number): Date {
    const date = new Date(at);
    if (typeof at === 'number') {
        // zero or below is a missing value more often than a date before 1970
        if (at <= 0) throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksInvalidDate, [key, 'at', at]);
        if (at < MIN_EPOCH_MS) throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksAtInSeconds, [key, at]);
    }

    if (Number.isNaN(date.getTime())) {
        throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidDate, [key, 'at', String(at)]);
    }
    return date;
}

export function resolveAt(key: string, when: When): Date {
    if (when.in === undefined) return parseAt(key, when.at);

    const date = new Date(Date.now() + parseIn(key, when.in));
    if (Number.isNaN(date.getTime())) {
        throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksDurationTooLong, [key, when.in]);
    }
    return date;
}
