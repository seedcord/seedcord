import { LoggerChannelRegistry } from '@seedcord/logger';
import { formatPretty } from '@seedcord/logger/node';

import type { Terminal } from './terminal';
import type { LogLevel } from '@seedcord/types';

export interface HeldOutput {
    // goes straight to the terminal, past the hold
    readonly write: (text: string) => void;
    readonly release: () => string[];
}

// debug and trace show only under --verbose
const DEFAULT_LEVELS: ReadonlySet<LogLevel> = new Set(['error', 'warn', 'info']);

function textOf(chunk: string | Uint8Array): string {
    return typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
}

export function holdOutput(stdout: Terminal, stderr: Terminal, verbose: boolean): HeldOutput {
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
                if (verbose || DEFAULT_LEVELS.has(record.level)) held.push(`${formatPretty(record)}\n`);
            }
        },
        { muteConsole: true }
    );

    return {
        write: (text) => {
            writeStdout(text);
        },
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
