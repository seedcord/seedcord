import { createLogger, transports } from 'winston';

import { consoleFormat, NODE_LEVELS, preFormat, toInfo } from './winston';

import type { SinkFormat } from './winston';
import type { ILogSink, LogRecord } from '@seedcord/types';
import type { Logger as Winston } from 'winston';

/** Node console sink. Pretty output for dev, JSON for prod, both through the shared winston pipeline. */
export class WinstonConsoleSink implements ILogSink {
    public readonly kind = 'console';
    public readonly node = true;

    private readonly winston: Winston;

    constructor(options?: { format?: SinkFormat }) {
        this.winston = createLogger({
            levels: NODE_LEVELS,
            level: 'trace',
            format: preFormat(),
            transports: [new transports.Console({ level: 'trace', format: consoleFormat(options?.format ?? 'pretty') })]
        });
    }

    public onLog(record: LogRecord): void {
        this.winston.log(toInfo(record));
    }
}
