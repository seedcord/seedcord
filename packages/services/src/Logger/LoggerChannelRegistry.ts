import { Envapter } from 'envapt';
import { createLogger } from 'winston';

import { TransportFactory } from './TransportFactory';

import type { ChannelConfig, LoggerConfiguration, LoggerLevel, TransportConfig, WinstonInstance } from './Types';

/**
 * Manages Winston logger instances per channel with caching.
 *
 * Handles channel configuration, transport creation,
 * and environment-aware defaults.
 * @internal
 */
export class LoggerChannelRegistry {
    private static _instance: LoggerChannelRegistry | null = null;

    private readonly DEFAULT_LEVEL: LoggerLevel = Envapter.isDevelopment
        ? 'silly'
        : Envapter.isStaging
          ? 'debug'
          : 'info';

    private config: LoggerConfiguration = {
        defaultChannel: 'default',
        channels: {},
        devFilePattern: 'logs/{channel}-{timestamp}.log',
        stagingFilePattern: 'logs/staging-{date}-{timestamp}.jsonl',
        prodFilePattern: 'logs/production-{date}.jsonl',
        fileMaxSizeMB: 10,
        fileMaxFiles: 5
    };

    private readonly FORMAT = Envapter.isDevelopment ? 'pretty' : 'json';

    private readonly cache = new Map<string, WinstonInstance>();
    private readonly transportFactory: TransportFactory;

    private constructor() {
        this.transportFactory = new TransportFactory();
    }

    /**
     * Gets the singleton instance of the registry.
     */
    public static get instance(): LoggerChannelRegistry {
        return (this._instance ??= new LoggerChannelRegistry());
    }

    private getDefaultChannelConfig(name: string): ChannelConfig {
        return {
            name,
            level: this.DEFAULT_LEVEL,
            transports: [
                { type: 'console', level: this.DEFAULT_LEVEL, format: this.FORMAT, stripAnsi: !Envapter.isDevelopment },
                {
                    type: 'file',
                    level: this.DEFAULT_LEVEL,
                    filename: Envapter.isDevelopment
                        ? this.config.devFilePattern
                        : Envapter.isStaging
                          ? this.config.stagingFilePattern
                          : this.config.prodFilePattern,
                    format: this.FORMAT,
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

    /**
     * Updates global logger configuration and clears cache.
     *
     * @param config - Partial configuration to merge with existing settings
     */
    public configure(config: Partial<LoggerConfiguration>): void {
        this.config = { ...this.config, ...config, channels: { ...this.config.channels, ...(config.channels ?? {}) } };
        this.cache.clear();
    }

    /**
     * Returns the name of the default channel.
     */
    public getDefaultChannel(): string {
        return this.config.defaultChannel;
    }

    /**
     * Gets or creates a Winston logger instance for the given channel.
     *
     * @param channel - Channel name to get logger for
     * @returns Configured Winston logger instance
     */
    public get(channel: string): WinstonInstance {
        const cached = this.cache.get(channel);
        if (cached) return cached;

        const channelConfig = this.mergeChannelConfig(
            this.getDefaultChannelConfig(channel),
            this.config.channels[channel]
        );

        const effectiveLevel = channelConfig.level ?? this.DEFAULT_LEVEL;
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
