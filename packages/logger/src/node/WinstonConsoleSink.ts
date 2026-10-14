import { createLogger, transports } from 'winston';

import { consoleFormat, NODE_LEVELS, preFormat, toInfo } from './winston';

import type { SinkFormat } from './winston';
import type { ILogSink, LogRecord } from '@seedcord/types';
import type { Logger as Winston } from 'winston';

let stdoutGone = false;
let watchingStdout = false;

// without a listener, node turns a failed stdout write (EPIPE once the reader exits) into an uncaughtException
function stopWritingWhenStdoutFails(): void {
    if (watchingStdout) return;
    watchingStdout = true;
    process.stdout.on('error', () => {
        stdoutGone = true;
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
        if (stdoutGone) return;
        this.winston.log(toInfo(record));
    }
}
