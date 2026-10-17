import { LoggerChannelRegistry } from '@seedcord/logger';
import { formatBody } from '@seedcord/logger/node';

import { levelMark } from './levelMark';

import type { Terminal } from './terminal';
import type { LogLevel, LogRecord } from '@seedcord/types';

export interface HeldOutput {
    readonly release: () => string[];
}

const LEVELS_SHOWN_RIGHT_AWAY: ReadonlySet<LogLevel> = new Set(['error', 'warn']);
const LEVELS_SHOWN_WITHOUT_VERBOSE: ReadonlySet<LogLevel> = new Set(['info']);

function stepLine(record: LogRecord): string {
    return `${levelMark(record.level)} ${formatBody(record)}`;
}

function textOf(chunk: string | Uint8Array): string {
    return typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
}

export function holdOutput(
    stdout: Terminal,
    stderr: Terminal,
    verbose: boolean,
    showNow: (line: string) => void
): HeldOutput {
    const held: string[] = [];
    const writeStdout = stdout.write.bind(stdout);
    const writeStderr = stderr.write.bind(stderr);

    const hold = (chunk: string | Uint8Array, ...rest: unknown[]): boolean => {
        held.push(textOf(chunk));
        // a caller waiting on the write callback would hang without this
        rest.find((arg): arg is () => void => typeof arg === 'function')?.();
        return true;
    };
    stdout.write = hold;
    stderr.write = hold;
    const capture = LoggerChannelRegistry.instance.installSink(
        {
            kind: 'capture',
            onLog: (record) => {
                if (LEVELS_SHOWN_RIGHT_AWAY.has(record.level)) showNow(stepLine(record));
                else if (verbose || LEVELS_SHOWN_WITHOUT_VERBOSE.has(record.level)) held.push(`${stepLine(record)}\n`);
            }
        },
        { muteConsole: true }
    );

    return {
        release: () => {
            stdout.write = writeStdout;
            stderr.write = writeStderr;
            capture.dispose();
            return held
                .join('')
                .split('\n')
                .filter((line) => line !== '');
        }
    };
}
