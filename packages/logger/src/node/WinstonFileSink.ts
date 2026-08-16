import { createLogger, transports } from 'winston';

import { ensureDir, fileFormat, NODE_LEVELS, preFormat, resolveFilename, toInfo } from './winston';

import type { SinkFormat } from './winston';
import type { ILogSink, LogRecord } from '@seedcord/types';
import type { Logger as Winston } from 'winston';

/** Node file sink. One combined file for every channel, `channel` carried as a field. */
export class WinstonFileSink implements ILogSink {
    public readonly kind = 'file';
    public readonly node = true;

    private readonly filename: string;
    private readonly format: SinkFormat;
    private readonly maxSize: number | undefined;
    private readonly maxFiles: number | undefined;
    // winston's File transport creates the file at construction, so a sink disposed before any log (repeated installNodeDefaults churns these) would leave an empty file
    private winston?: Winston;

    constructor(options?: { filename?: string; format?: SinkFormat; maxSize?: number; maxFiles?: number }) {
        this.filename = resolveFilename(options?.filename ?? 'logs/combined-{timestamp}.log');
        this.format = options?.format ?? 'pretty';
        this.maxSize = options?.maxSize;
        this.maxFiles = options?.maxFiles;
    }

    private open(): Winston {
        if (this.winston) return this.winston;
        ensureDir(this.filename);
        this.winston = createLogger({
            levels: NODE_LEVELS,
            level: 'trace',
            format: preFormat(),
            transports: [
                new transports.File({
                    level: 'trace',
                    filename: this.filename,
                    format: fileFormat(this.format),
                    tailable: true,
                    ...(this.maxSize !== undefined && { maxsize: this.maxSize }),
                    ...(this.maxFiles !== undefined && { maxFiles: this.maxFiles })
                })
            ]
        });
        return this.winston;
    }

    public onLog(record: LogRecord): void {
        this.open().log(toInfo(record));
    }

    public dispose(): void {
        this.winston?.close();
    }

    public [Symbol.dispose](): void {
        this.dispose();
    }
}
