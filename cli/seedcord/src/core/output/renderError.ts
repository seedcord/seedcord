import { isSeedcordError, paint } from '@seedcord/errors';

import { wrapLines } from './wrapLines';

import type { LinePrefix } from './wrapLines';

interface RenderOptions {
    verbose: boolean;
    width: number | undefined;
}

const MESSAGE: LinePrefix = { first: '  ', rest: '  ' };
const BULLET: LinePrefix = { first: '  • ', rest: '    ' };

function indent(text: string): string {
    return text
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
}

export function messageOf(error: unknown): string {
    if (isSeedcordError(error)) return `${paint.mute(`[${error.code}]`)} ${error.message}`;
    if (Error.isError(error)) return error.message;
    return String(error);
}

// a stack opens with "Name: message"
function renderStack(error: Error, width: number | undefined): string {
    const [title = '', ...frames] = (error.stack ?? `${error.name}: ${error.message}`).split('\n');
    const framesBlock = frames.length > 0 ? `${paint.mute(indent(frames.join('\n')))}\n` : '';
    return wrapLines(title, width, MESSAGE) + framesBlock;
}

// the stack repeats every line of the message before the frames
function stackFrames(error: Error): string {
    const stack = error.stack ?? '';
    return stack
        .split('\n')
        .filter((line) => /^\s+at /.test(line))
        .join('\n');
}

function renderCause(cause: unknown): string {
    const text = Error.isError(cause) ? (cause.stack ?? cause.message) : String(cause);
    return `\n${paint.mute(indent(`cause: ${text}`))}\n`;
}

export function renderError(error: unknown, { verbose, width }: RenderOptions): string {
    if (!isSeedcordError(error)) {
        return Error.isError(error) ? renderStack(error, width) : wrapLines(String(error), width, MESSAGE);
    }

    let output = wrapLines(messageOf(error), width, MESSAGE);
    if (isSeedcordError(error, 'SeedcordAggregateError')) {
        for (const problem of error.errors) {
            output += wrapLines(messageOf(problem), width, BULLET);
            if (verbose && Error.isError(problem) && problem.cause !== undefined) output += renderCause(problem.cause);
        }
    }
    if (verbose) {
        output += `\n${paint.mute(indent(stackFrames(error)))}\n`;
        if (error.cause !== undefined) output += renderCause(error.cause);
    }
    return output;
}
