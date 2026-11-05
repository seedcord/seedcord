import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { parseDuration } from '@seedcord/utils';

import type { When } from './types/Tasks';
import type { JsonValue } from 'type-fest';

// 2000-01-01 in ms. A smaller number is almost always a timestamp in seconds
const MIN_EPOCH_MS = 946_684_800_000;

export function isTimezone(timezone: string): boolean {
    try {
        return new Intl.DateTimeFormat(undefined, { timeZone: timezone }).resolvedOptions().timeZone.length > 0;
    } catch {
        return false;
    }
}

function parseIn(duration: string): number {
    const ms = parseDuration(duration);
    if (ms === null) throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidDuration, [duration]);
    return ms;
}

function parseAt(key: string, at: Date | number): Date {
    if (typeof at === 'number' && at < MIN_EPOCH_MS) {
        throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksAtInSeconds, [at]);
    }

    const date = new Date(at);
    if (Number.isNaN(date.getTime())) throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidDate, [key]);
    return date;
}

export function resolveAt(key: string, when: When): Date {
    if (when.in === undefined) return parseAt(key, when.at);

    const date = new Date(Date.now() + parseIn(when.in));
    if (Number.isNaN(date.getTime())) {
        throw new SeedcordRangeError(SeedcordErrorCode.PluginTasksDurationTooLong, [key, when.in]);
    }
    return date;
}

// the types reject most of what JSON can't keep. a cycle still compiles
export function toJson(key: string, data: unknown): JsonValue {
    try {
        const text = JSON.stringify(data);
        // justified: JSON.parse returns any, and this text came from JSON.stringify
        return JSON.parse(text) as JsonValue;
    } catch (error) {
        throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksDataNotJson, [key], { cause: error });
    }
}
