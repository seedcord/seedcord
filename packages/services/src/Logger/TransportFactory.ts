import fs from 'node:fs';
import path from 'node:path';

import { Envapter } from 'envapt';
import { format, transports } from 'winston';

import { LogFormatter } from './LogFormatter';

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
 * Creates Winston transports with proper formatting and file path resolution.
 *
 * Handles console and file transports with environment-aware defaults,
 * filename template expansion, and format selection.
 * @internal
 */
export class TransportFactory {
    private readonly formatter: LogFormatter;
    private readonly MILLISECOND_PAD = 3;

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

    private pad(value: number): string {
        return value.toString().padStart(2, '0');
    }

    private buildTimestamp(): { date: string; timestamp: string } {
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

        return { date, timestamp };
    }

    private resolveFilename(template: string, channel: string): string {
        const { date, timestamp } = this.buildTimestamp();
        return template.replace('{channel}', channel).replace('{date}', date).replace('{timestamp}', timestamp);
    }

    /**
     * Builds a Winston transport from configuration.
     *
     * Creates either console or file transport with proper formatting,
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

        const filenameTemplate = input.config.filename ?? 'logs/application-{timestamp}.log';
        const resolvedFilename = this.resolveFilename(filenameTemplate, input.channel);
        this.ensureDir(resolvedFilename);

        return new transports.File({
            level,
            filename: resolvedFilename,
            ...(input.config.maxSize !== undefined ? { maxsize: input.config.maxSize } : {}),
            ...(input.config.maxFiles !== undefined ? { maxFiles: input.config.maxFiles } : {}),
            tailable: true,
            format: this.buildFileFormat(input.label, effectiveFormat, shouldStripAnsi)
        });
    }
}
