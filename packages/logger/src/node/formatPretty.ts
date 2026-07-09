import { prettyPipeline, toInfo } from './winston';

import type { LogRecord } from '../types';

const MESSAGE = Symbol.for('message');
const pipeline = prettyPipeline();

/** Renders a record to the colored dev-TUI line, the same pipeline the pretty console sink runs. */
export function formatPretty(record: LogRecord): string {
    const transformed = pipeline.transform(toInfo(record), {});
    if (transformed === false) return record.message;
    const rendered = (transformed as Record<symbol, unknown>)[MESSAGE];
    return typeof rendered === 'string' ? rendered : record.message;
}
