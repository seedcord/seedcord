import { createLogger, transports } from 'winston';

import { ensureDir, fileFormat, NODE_LEVELS, preFormat, resolveFilename, toInfo } from './winston';

import type { SinkFormat } from './winston';
import type { ILogSink, LogRecord } from '../types';
import type { Logger as Winston } from 'winston';

/** Node file sink. One combined file for every channel, `channel` carried as a field. */
export class WinstonFileSink implements ILogSink {
    public readonly kind = 'file';
    public readonly node = true;

    private readonly winston: Winston;

    constructor(options?: { filename?: string; format?: SinkFormat; maxSize?: number; maxFiles?: number }) {
        const filename = resolveFilename(options?.filename ?? 'logs/combined-{timestamp}.log');
        ensureDir(filename);
        this.winston = createLogger({
            levels: NODE_LEVELS,
            level: 'trace',
            format: preFormat(),
            transports: [
                new transports.File({
                    level: 'trace',
                    filename,
                    format: fileFormat(options?.format ?? 'pretty'),
                    tailable: true,
                    ...(options?.maxSize !== undefined && { maxsize: options.maxSize }),
                    ...(options?.maxFiles !== undefined && { maxFiles: options.maxFiles })
                })
            ]
        });
    }

    public onLog(record: LogRecord): void {
        this.winston.log(toInfo(record));
    }

    public dispose(): void {
        this.winston.close();
    }

    public [Symbol.dispose](): void {
        this.dispose();
    }
}
