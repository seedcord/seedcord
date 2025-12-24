import { Envapter } from 'envapt';
import { createLogger } from 'winston';

import { TransportFactory } from './TransportFactory';

import type { ChannelConfig, LoggerConfiguration, LoggerLevel, TransportConfig, WinstonInstance } from './types';

const defaultLevel: LoggerLevel = Envapter.isDevelopment ? 'silly' : Envapter.isStaging ? 'debug' : 'info';

export class LoggerChannelRegistry {
    private static _instance: LoggerChannelRegistry;

    private config: LoggerConfiguration = {
        defaultChannel: 'default',
        channels: {},
        devFilePattern: 'logs/{channel}-{timestamp}.log',
        prodFilePattern: 'logs/production-{date}.jsonl',
        fileMaxSizeMB: 10,
        fileMaxFiles: 5
    };

    private readonly cache = new Map<string, WinstonInstance>();
    private readonly transportFactory: TransportFactory;

    private constructor() {
        this.transportFactory = new TransportFactory();
    }

    public static get instance(): LoggerChannelRegistry {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return (this._instance ??= new LoggerChannelRegistry());
    }

    private getDefaultChannelConfig(name: string): ChannelConfig {
        return {
            name,
            level: defaultLevel,
            transports: [
                { type: 'console', level: defaultLevel, format: 'pretty' },
                {
                    type: 'file',
                    level: Envapter.isDevelopment ? 'debug' : 'info',
                    filename: Envapter.isDevelopment ? this.config.devFilePattern : this.config.prodFilePattern,
                    format: Envapter.isDevelopment ? 'pretty' : 'json',
                    stripAnsi: true,
                    maxSize: this.config.fileMaxSizeMB * 1024 * 1024,
                    maxFiles: this.config.fileMaxFiles
                }
            ]
        };
    }

    private mergeChannelConfig(base: ChannelConfig, override?: ChannelConfig): ChannelConfig {
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

    public configure(config: Partial<LoggerConfiguration>): void {
        this.config = { ...this.config, ...config, channels: { ...this.config.channels, ...(config.channels ?? {}) } };
        this.cache.clear();
    }

    public getDefaultChannel(): string {
        return this.config.defaultChannel;
    }

    public get(channel: string): WinstonInstance {
        const cached = this.cache.get(channel);
        if (cached) return cached;

        const channelConfig = this.mergeChannelConfig(
            this.getDefaultChannelConfig(channel),
            this.config.channels[channel]
        );

        const effectiveLevel = channelConfig.level ?? defaultLevel;
        const transports = (channelConfig.transports ?? []).map((transportConfig: TransportConfig) =>
            this.transportFactory.build({
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
