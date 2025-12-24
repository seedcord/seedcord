import { Envapter } from 'envapt';
import { createLogger } from 'winston';

import { TransportFactory } from './transports';

import type { ChannelConfig, LoggerConfiguration, LoggerLevel, TransportConfig, WinstonInstance } from './types';

const defaultLevel: LoggerLevel = Envapter.isDevelopment ? 'silly' : Envapter.isStaging ? 'debug' : 'info';

export class LoggerChannelRegistry {
    private static config: LoggerConfiguration = {
        defaultChannel: 'default',
        channels: {},
        devFilePattern: 'logs/{channel}-{timestamp}.log',
        prodFilePattern: 'logs/production-{date}.json',
        fileMaxSizeMB: 10,
        fileMaxFiles: 5
    };

    private static readonly cache = new Map<string, WinstonInstance>();

    private static defaultChannelConfig(name: string): ChannelConfig {
        return {
            name,
            level: defaultLevel,
            transports: [
                { type: 'console', level: defaultLevel, format: 'pretty' },
                {
                    type: 'file',
                    level: 'debug',
                    filename: Envapter.isDevelopment ? this.config.devFilePattern : this.config.prodFilePattern,
                    format: Envapter.isDevelopment ? 'pretty' : 'json',
                    stripAnsi: true,
                    maxSize: this.config.fileMaxSizeMB * 1024 * 1024,
                    maxFiles: this.config.fileMaxFiles
                }
            ]
        };
    }

    private static mergeChannelConfig(base: ChannelConfig, override?: ChannelConfig): ChannelConfig {
        if (!override) return base;

        const level = override.level ?? base.level;
        const stripAnsi = override.stripAnsi ?? base.stripAnsi;
        const format = override.format ?? base.format;
        const transports = override.transports ?? base.transports;
        const name = override.name || base.name;

        return {
            name,
            ...(level ? { level } : {}),
            ...(stripAnsi !== undefined ? { stripAnsi } : {}),
            ...(format ? { format } : {}),
            ...(transports ? { transports } : {})
        };
    }

    public static configure(config: Partial<LoggerConfiguration>): void {
        this.config = { ...this.config, ...config, channels: { ...this.config.channels, ...(config.channels ?? {}) } };
        this.cache.clear();
    }

    public static getDefaultChannel(): string {
        return this.config.defaultChannel;
    }

    public static get(channel: string): WinstonInstance {
        const cached = this.cache.get(channel);
        if (cached) return cached;

        const channelConfig = this.mergeChannelConfig(
            this.defaultChannelConfig(channel),
            this.config.channels[channel]
        );

        const effectiveLevel = channelConfig.level ?? defaultLevel;
        const transports = (channelConfig.transports ?? []).map((transportConfig: TransportConfig) =>
            TransportFactory.build({
                channel,
                label: channel,
                level: effectiveLevel,
                config: transportConfig,
                defaultFormat: channelConfig.format ?? 'pretty',
                stripAnsi: channelConfig.stripAnsi ?? true
            })
        );

        const logger = createLogger({ level: effectiveLevel, transports });
        this.cache.set(channel, logger);
        return logger;
    }
}
