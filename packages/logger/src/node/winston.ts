import fs from 'node:fs';
import path from 'node:path';

import { format } from 'winston';

import { LogFormatter } from './LogFormatter';

import type { LogLevel, LogRecord } from '../types';
import type { Logform, LogEntry } from 'winston';

// satisfies both winston call sites. Logger.log requires LogEntry (message: string) and a format
// transform requires TransformableInfo (symbol index).
type WinstonInfo = LogEntry & Logform.TransformableInfo;

const SPLAT = Symbol.for('splat');
// formatPretty bypasses createLogger, so it must set this manually
const LEVEL = Symbol.for('level');

/** Winston has no `trace` in its npm levels, so the node sinks pass this scale to createLogger. */
export const NODE_LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };

export type SinkFormat = 'pretty' | 'json';

const formatter = new LogFormatter();

export function preFormat(): ReturnType<typeof format.combine> {
    return format.combine(formatter.createPreFormat());
}

export function consoleFormat(mode: SinkFormat): ReturnType<typeof format.combine> {
    return mode === 'json'
        ? format.combine(...formatter.json({ stripAnsi: true }))
        : format.combine(...formatter.pretty());
}

export function fileFormat(mode: SinkFormat): ReturnType<typeof format.combine> {
    return mode === 'json'
        ? format.combine(...formatter.json({ stripAnsi: true }))
        : format.combine(...formatter.pretty({ stripExtras: true }));
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

// Convert LogRecord to winston's single info-object form. winston's vararg path pre-sets info.stack from an
// Error arg before the format chain;. the info-object path does not, so extract it here.
export function toInfo(record: LogRecord): WinstonInfo {
    const stack = firstErrorStack(record.args);
    return {
        level: record.level,
        message: record.message,
        label: record.label,
        channel: record.channel,
        timestamp: new Date(record.timestamp).toISOString(),
        ...(stack !== undefined && { stack }),
        [LEVEL]: record.level,
        [SPLAT]: record.args ?? []
    };
}

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

function buildTimestamp(): { date: string; timestamp: string } {
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timestamp = `${date}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return { date, timestamp };
}

export function resolveFilename(template: string): string {
    const { date, timestamp } = buildTimestamp();
    return template.replaceAll('{date}', date).replaceAll('{timestamp}', timestamp);
}

export function ensureDir(filepath: string): void {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
