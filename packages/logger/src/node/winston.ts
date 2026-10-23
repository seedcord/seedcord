import fs from 'node:fs';
import path from 'node:path';

import { format } from 'winston';

import { LogFormatter } from './LogFormatter';

import type { LogLevel, LogRecord } from '@seedcord/types';
import type { Logform, LogEntry } from 'winston';

// Logger.log requires LogEntry (message: string), while a format transform requires TransformableInfo (symbol index)
type WinstonInfo = LogEntry & Logform.TransformableInfo;

const SPLAT = Symbol.for('splat');
const LEVEL = Symbol.for('level');

// winston's default npm levels have no `trace`
export const NODE_LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };

export type SinkFormat = 'pretty' | 'json' | 'json-ansi';

export type FileSinkFormat = Exclude<SinkFormat, 'json-ansi'>;

const formatter = new LogFormatter();

export function preFormat(): ReturnType<typeof format.combine> {
    return format.combine(formatter.createPreFormat());
}

export function consoleFormat(mode: SinkFormat): ReturnType<typeof format.combine> {
    return mode === 'pretty'
        ? format.combine(...formatter.pretty())
        : format.combine(...formatter.json({ stripAnsi: mode === 'json' }));
}

export function fileFormat(mode: FileSinkFormat): ReturnType<typeof format.combine> {
    return mode === 'pretty'
        ? format.combine(...formatter.pretty({ stripExtras: true }))
        : format.combine(...formatter.json({ stripAnsi: true }));
}

export function prettyPipeline(): ReturnType<typeof format.combine> {
    return format.combine(formatter.createPreFormat(), ...formatter.pretty());
}

export function bodyPipeline(): ReturnType<typeof format.combine> {
    return format.combine(formatter.createPreFormat(), ...formatter.pretty({ prefix: false }));
}

function firstErrorStack(args?: unknown[]): string | undefined {
    const error = args?.find((arg): arg is Error => Error.isError(arg));
    return error?.stack;
}

// winston sets info.stack for logger.error('msg', err), but logger.log(info) leaves it unset
export function toInfo(record: LogRecord): WinstonInfo {
    const stack = firstErrorStack(record.args);
    return {
        level: record.level,
        message: record.message,
        label: record.label,
        channel: record.channel,
        timestamp: new Date(record.timestamp).toISOString(),
        ...(stack !== undefined && { stack }),
        [LEVEL]: record.level, // createLogger normally sets this. formatPretty never calls it.
        [SPLAT]: record.args ?? []
    };
}

const MS_DIGITS = 3;

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

function buildTimestamp(): { date: string; timestamp: string } {
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const clock = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    // milliseconds keep two runs started in the same second on separate files
    const ms = now.getMilliseconds().toString().padStart(MS_DIGITS, '0');
    return { date, timestamp: `${date}-${clock}-${ms}` };
}

export function resolveFilename(template: string): string {
    const { date, timestamp } = buildTimestamp();
    return template.replaceAll('{date}', date).replaceAll('{timestamp}', timestamp);
}

export function ensureDir(filepath: string): void {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
