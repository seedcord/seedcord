import fs from 'node:fs';
import path from 'node:path';

import { Envapter } from 'envapt';
import { format, transports } from 'winston';

import { LogFormatter } from './LogFormatter';
import { SinkTransport } from './Transports/SinkTransport';

import type { ILoggerSink } from './Transports/SinkTransport';
import type { LoggerFormatMode, LoggerLevel, TransportConfig, WinstonTransport } from './Types';

/**
 * Input parameters for building a Winston transport.
 * @internal
 */
export interface TransportBuildInput {
    channel: string;
    label: string;
    level: LoggerLevel;
    config: TransportConfig;
    defaultFormat: LoggerFormatMode;
    stripAnsi: boolean;
}

/**
 * Input parameters for building a sink transport.
 * @internal
 */
interface BuildInput {
    readonly channel: string;
    readonly label: string;
    readonly level: LoggerLevel;
}

/**
 * Creates Winston transports with proper formatting and file path resolution.
 *
 * Builds console and file transports with environment-aware defaults,
 * filename template expansion, and format selection.
 * @internal
 */
export class TransportFactory {
    private readonly formatter: LogFormatter;
    private readonly MILLISECOND_PAD = 3;
    private cachedSessionTimestamp: { date: string; timestamp: string } | null = null;

    constructor() {
        this.formatter = new LogFormatter();
    }

    private ensureDir(filepath: string): void {
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    private withDefaultLabel(label: string): ReturnType<typeof format.combine> {
        return format.combine(
            format((info) => {
                info.label ??= label;
                return info;
            })()
        );
    }

    public buildPreFormat(): ReturnType<typeof format.combine> {
        return format.combine(this.formatter.createPreFormat());
    }

    private buildConsoleFormat(label: string): ReturnType<typeof format.combine> {
        // Use JSON format in production, pretty format in development
        if (Envapter.isProduction) {
            return format.combine(this.withDefaultLabel(label), ...this.formatter.json({ stripAnsi: true }));
        }
        return format.combine(this.withDefaultLabel(label), ...this.formatter.pretty());
    }

    private buildFileFormat(
        label: string,
        mode: LoggerFormatMode,
        stripAnsi: boolean
    ): ReturnType<typeof format.combine> {
        const formats =
            mode === 'pretty' ? this.formatter.pretty({ stripExtras: stripAnsi }) : this.formatter.json({ stripAnsi });
        return format.combine(this.withDefaultLabel(label), ...formats);
    }

    private buildStreamFormat(
        label: string,
        mode: LoggerFormatMode,
        stripAnsi: boolean
    ): ReturnType<typeof format.combine> {
        // Stream transport uses similar formatting to file transport
        const formats =
            mode === 'pretty' ? this.formatter.pretty({ stripExtras: stripAnsi }) : this.formatter.json({ stripAnsi });
        return format.combine(this.withDefaultLabel(label), ...formats);
    }

    private pad(value: number): string {
        return value.toString().padStart(2, '0');
    }

    private buildTimestamp(): { date: string; timestamp: string } {
        if (this.cachedSessionTimestamp) {
            return this.cachedSessionTimestamp;
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = this.pad(now.getMonth() + 1);
        const dd = this.pad(now.getDate());
        const hh = this.pad(now.getHours());
        const min = this.pad(now.getMinutes());
        const ss = this.pad(now.getSeconds());
        const ms = now.getMilliseconds().toString().padStart(this.MILLISECOND_PAD, '0');

        const date = `${yyyy}-${mm}-${dd}`;
        const timestamp = `${date}-${hh}${min}${ss}-${ms}`;

        this.cachedSessionTimestamp = { date, timestamp };
        return this.cachedSessionTimestamp;
    }

    private resolveFilename(template: string, channel: string): string {
        const { date, timestamp } = this.buildTimestamp();
        return template
            .replaceAll('{channel}', channel)
            .replaceAll('{date}', date)
            .replaceAll('{timestamp}', timestamp);
    }

    /**
     * Builds a Winston transport from configuration.
     *
     * Creates console, file, or stream transport with proper formatting,
     * level filtering, and file rotation settings.
     *
     * @param input - Transport configuration parameters
     * @returns Configured Winston transport instance
     */
    public build(input: TransportBuildInput): WinstonTransport {
        const effectiveFormat = input.config.format ?? input.defaultFormat;
        const shouldStripAnsi = input.config.stripAnsi ?? input.stripAnsi;
        const level = input.config.level ?? input.level;

        if (input.config.type === 'console') {
            return new transports.Console({
                level,
                format: this.buildConsoleFormat(input.label)
            });
        }

        if (input.config.type === 'stream') {
            return new transports.Stream({
                level,
                stream: input.config.stream,
                format: this.buildStreamFormat(input.label, effectiveFormat, shouldStripAnsi)
            });
        }

        const filenameTemplate = input.config.filename ?? 'logs/application-{timestamp}.log';
        const resolvedFilename = this.resolveFilename(filenameTemplate, input.channel);
        this.ensureDir(resolvedFilename);

        return new transports.File({
            level,
            filename: resolvedFilename,
            ...(input.config.maxSize !== undefined && { maxsize: input.config.maxSize }),
            ...(input.config.maxFiles !== undefined && { maxFiles: input.config.maxFiles }),
            tailable: true,
            format: this.buildFileFormat(input.label, effectiveFormat, shouldStripAnsi)
        });
    }

    /**
     * Builds a sink transport for routing logs to custom destinations.
     *
     * @param input - Transport configuration with channel and level info
     * @param sink - Custom sink to receive log entries
     * @returns Configured sink transport instance
     */
    public buildSinkTransport(input: BuildInput, sink: ILoggerSink): WinstonTransport {
        const format = this.buildConsoleFormat(input.label);

        return new SinkTransport({
            level: input.level,
            channel: input.channel,
            sink,
            format
        });
    }
}
