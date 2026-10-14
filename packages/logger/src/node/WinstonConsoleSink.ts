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

/** Node console sink. Pretty output for dev, JSON for prod, both through the shared winston pipeline. */
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
            transports: [new transports.Console({ level: 'trace', format: consoleFormat(options?.format ?? 'pretty') })]
        });
    }

    public onLog(record: LogRecord): void {
        if (stdout === 'failed') return;
        this.winston.log(toInfo(record));
    }
}
