import path from 'node:path';

import { Envapter } from 'envapt';
import winston, { createLogger } from 'winston';

import { TransportFactory } from './TransportFactory';

import type { ILoggerSink, ILoggerSinkHandle } from './Transports/SinkTransport';
import type {
    ChannelConfig,
    LoggerConfiguration,
    LoggerLevel,
    TransportConfig,
    WinstonInstance,
    WinstonTransport
} from './Types';

/**
 * Manages Winston logger instances per channel with caching.
 *
 * Handles channel configuration, transport creation,
 * and environment-aware defaults.
 * @internal
 */
export class LoggerChannelRegistry {
    private static _instance: LoggerChannelRegistry | null = null;

    private nextSinkId = 1;
    private readonly sinks = new Map<
        number,
        {
            readonly sink: ILoggerSink;
            readonly muteConsole: boolean;
            readonly transportsByChannel: Map<string, WinstonTransport>;
            readonly removedConsoleByChannel: Map<string, WinstonTransport[]>;
        }
    >();

    private readonly DEFAULT_LEVEL: LoggerLevel = Envapter.isDevelopment
        ? 'silly'
        : Envapter.isStaging
          ? 'debug'
          : 'info';

    private config: LoggerConfiguration = {
        defaultChannel: 'default',
        channels: {},
        files: {
            maxSizeMB: 10,
            maxFiles: 5,
            patterns: {
                dev: 'logs/{channel}-{timestamp}.log',
                staging: 'logs/staging-{date}-{timestamp}.jsonl',
                prod: 'logs/production-{date}.jsonl'
            }
        }
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
                        ? this.config.files.patterns.dev
                        : Envapter.isStaging
                          ? this.config.files.patterns.staging
                          : this.config.files.patterns.prod,
                    format: this.FORMAT,
                    stripAnsi: true,
                    maxSize: this.config.files.maxSizeMB * 1024 * 1024,
                    maxFiles: this.config.files.maxFiles
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
            ...(level !== undefined ? { level } : {}),
            ...(stripAnsi !== undefined ? { stripAnsi } : {}),
            ...(format !== undefined ? { format } : {}),
            ...(transports !== undefined ? { transports } : {})
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
     * Returns a list of all known channels (configured or cached).
     */
    public getChannels(): string[] {
        const configuredChannels = Object.keys(this.config.channels);
        const cachedChannels = Array.from(this.cache.keys());
        const allChannels = new Set([...configuredChannels, ...cachedChannels, this.config.defaultChannel]);
        return Array.from(allChannels).sort();
    }

    /**
     * Gets the log file path for a specific channel, if one exists.
     *
     * @param channel - Channel name to get log file path for
     * @returns The log file path, or null if no file transport exists
     */
    public getLogFilePath(channel: string): string | null {
        const logger = this.cache.get(channel);
        if (!logger) return null;

        for (const transport of logger.transports) {
            if (transport instanceof winston.transports.File) {
                return path.resolve(transport.dirname, transport.filename);
            }
        }

        return null;
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

        const consoleMuted = this.isConsoleMuted();

        const transports = (channelConfig.transports ?? [])
            .filter((transportConfig: TransportConfig) => !(consoleMuted && transportConfig.type === 'console'))
            .map((transportConfig: TransportConfig) =>
                this.transportFactory.build({
                    channel,
                    label: channel,
                    level: effectiveLevel,
                    config: transportConfig,
                    defaultFormat: channelConfig.format ?? 'pretty',
                    stripAnsi: channelConfig.stripAnsi ?? true
                })
            );

        const logger = createLogger({
            level: effectiveLevel,
            format: this.transportFactory.buildPreFormat(),
            transports
        });

        for (const entry of this.sinks.values()) {
            this.applySinkToCachedLogger(channel, logger, entry);
        }

        this.cache.set(channel, logger);
        return logger;
    }

    private isConsoleMuted(): boolean {
        for (const entry of this.sinks.values()) {
            if (entry.muteConsole) return true;
        }
        return false;
    }

    /**
     * Installs a custom sink to capture log output across all channels.
     *
     * Useful for routing logs to custom destinations like TUIs or remote services.
     *
     * @param sink - Custom sink implementation to receive log entries
     * @param options - Optional configuration for console muting behavior
     * @returns Handle to dispose the sink when no longer needed
     */
    public installSink(sink: ILoggerSink, options?: { muteConsole?: boolean }): ILoggerSinkHandle {
        const id = this.nextSinkId;
        this.nextSinkId += 1;

        const record = {
            sink,
            muteConsole: options?.muteConsole ?? true,
            transportsByChannel: new Map<string, WinstonTransport>(),
            removedConsoleByChannel: new Map<string, WinstonTransport[]>()
        };

        this.sinks.set(id, record);

        for (const [channel, logger] of this.cache.entries()) {
            this.applySinkToCachedLogger(channel, logger, record);
        }

        return new (class implements ILoggerSinkHandle {
            public constructor(
                private readonly registry: LoggerChannelRegistry,
                private readonly key: number
            ) {}
            public dispose(): void {
                this.registry.uninstallSink(this.key);
            }
        })(this, id);
    }

    private uninstallSink(id: number): void {
        const record = this.sinks.get(id);
        if (!record) return;

        for (const [channel, logger] of this.cache.entries()) {
            const sinkTransport = record.transportsByChannel.get(channel);
            if (sinkTransport) logger.remove(sinkTransport);

            const removed = record.removedConsoleByChannel.get(channel);
            if (removed?.length) {
                for (const t of removed) logger.add(t);
            }
        }

        this.sinks.delete(id);
    }

    private applySinkToCachedLogger(
        channel: string,
        logger: WinstonInstance,
        record: {
            readonly sink: ILoggerSink;
            readonly muteConsole: boolean;
            readonly transportsByChannel: Map<string, WinstonTransport>;
            readonly removedConsoleByChannel: Map<string, WinstonTransport[]>;
        }
    ): void {
        if (record.muteConsole) {
            const removed: WinstonTransport[] = [];
            for (const t of logger.transports) {
                if (t instanceof winston.transports.Console) {
                    removed.push(t);
                }
            }
            if (removed.length) {
                for (const t of removed) logger.remove(t);
                record.removedConsoleByChannel.set(channel, removed);
            }
        }

        const sinkTransport = this.transportFactory.buildSinkTransport(
            { channel, label: channel, level: logger.level as unknown as LoggerLevel },
            record.sink
        );

        logger.add(sinkTransport);
        record.transportsByChannel.set(channel, sinkTransport);
    }
}
