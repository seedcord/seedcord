import fs from 'node:fs';
import path from 'node:path';

import { format, transports } from 'winston';

import { LogFormatter } from './formatters';
import { FilenameResolver } from './utils/filename';

import type { LoggerFormatMode, LoggerLevel, TransportConfig, WinstonTransport } from './types';

interface TransportBuildInput {
    channel: string;
    label: string;
    level: LoggerLevel;
    config: TransportConfig;
    defaultFormat: LoggerFormatMode;
    stripAnsi: boolean;
}

export class TransportFactory {
    private static ensureDir(filepath: string): void {
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    private static withDefaultLabel(label: string): ReturnType<typeof format.combine> {
        return format.combine(
            format((info) => {
                info.label ??= label;
                return info;
            })()
        );
    }

    private static buildConsoleFormat(label: string): ReturnType<typeof format.combine> {
        return format.combine(this.withDefaultLabel(label), ...LogFormatter.pretty());
    }

    private static buildFileFormat(
        label: string,
        mode: LoggerFormatMode,
        stripAnsi: boolean
    ): ReturnType<typeof format.combine> {
        const formats =
            mode === 'pretty' ? LogFormatter.pretty({ stripExtras: stripAnsi }) : LogFormatter.json({ stripAnsi });
        return format.combine(this.withDefaultLabel(label), ...formats);
    }

    public static build(input: TransportBuildInput): WinstonTransport {
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
        const resolvedFilename = FilenameResolver.resolve(filenameTemplate, input.channel);
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
