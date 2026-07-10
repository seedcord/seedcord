import { bodyPipeline, prettyPipeline, toInfo } from './winston';

import type { LogRecord } from '../types';

const MESSAGE = Symbol.for('message');
const pretty = prettyPipeline();
const body = bodyPipeline();

function render(pipeline: ReturnType<typeof prettyPipeline>, record: LogRecord): string {
    const transformed = pipeline.transform(toInfo(record), {});
    if (typeof transformed === 'boolean') return record.message;
    const rendered = transformed[MESSAGE];
    return typeof rendered === 'string' ? rendered : record.message;
}

/** Renders a record to the colored dev-TUI line, the same pipeline the pretty console sink runs. */
export function formatPretty(record: LogRecord): string {
    return render(pretty, record);
}

/** Renders the styled message body (interpolation, args, stack), omitting the time/level/label prefix. */
export function formatBody(record: LogRecord): string {
    return render(body, record);
}
