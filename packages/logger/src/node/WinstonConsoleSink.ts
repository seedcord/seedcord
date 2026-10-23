import { isInteractive } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';
import { createLogger, transports } from 'winston';

import { consoleFormat, NODE_LEVELS, preFormat, toInfo } from './winston';

import type { SinkFormat } from './winston';
import type { ILogSink, LogRecord } from '@seedcord/types';
import type { Logger as Winston } from 'winston';

let stdout: 'unwatched' | 'open' | 'failed' = 'unwatched';

function stopWritingWhenStdoutFails(): void {
    if (stdout !== 'unwatched') return;
    stdout = 'open';
    // node throws a stdout write error as an uncaughtException without a listener here
    process.stdout.on('error', () => {
        stdout = 'failed';
    });
}

function defaultFormat(): SinkFormat {
    if (!Envapter.isDevelopment) return 'json';
    return isInteractive() ? 'pretty' : 'json-ansi';
}

/**
 * Node console sink. `format` is `pretty` columns, `json` lines with the ANSI codes stripped, or `json-ansi`
 * lines that keep them for a tool that renders the colors.
 *
 * Without a `format` it is `pretty` in development when run from a terminal, `json-ansi` in development when
 * piped, redirected, or under CI, and `json` in any other environment.
 */
export class WinstonConsoleSink implements ILogSink {
    public readonly kind = 'console';
    public readonly node = true;

    private readonly winston: Winston;

    constructor(options?: { format?: SinkFormat }) {
        stopWritingWhenStdoutFails();
        this.winston = createLogger({
            levels: NODE_LEVELS,
            level: 'trace',
            format: preFormat(),
            transports: [
                new transports.Console({ level: 'trace', format: consoleFormat(options?.format ?? defaultFormat()) })
            ]
        });
    }

    public onLog(record: LogRecord): void {
        if (stdout === 'failed') return;
        this.winston.log(toInfo(record));
    }
}
