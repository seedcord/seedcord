import { LoggerChannelRegistry } from './LoggerChannelRegistry';
import { LoggerUtilitiesAccessor } from './LoggerUtilities';

import type { LoggerConfiguration, LoggerOptions } from './Types';
import type { ILogger } from '@seedcord/types';
import type { Logger as Winston } from 'winston';

/**
 * Public logging service with channel-aware transports and per-run file output.
 *
 * - Channel separation (e.g., bot, cli, hmr)
 * - Production-safe JSON logs with ANSI stripping
 * - Unique log files per run via filename templates
 */
export class Logger implements ILogger {
    declare private logger: Winston;
    private readonly label: string;
    private channel: string;
    private readonly registry = LoggerChannelRegistry.instance;

    /* Common logging utilities for structured and formatted output */
    public readonly utils: LoggerUtilitiesAccessor;

    private static readonly instances = new Map<string, Logger>();

    private static instance(prefix: string): Logger {
        let instance = this.instances.get(prefix);
        if (!instance) {
            instance = new Logger(prefix);
            this.instances.set(prefix, instance);
        }
        return instance;
    }

    /**
     * Configures global logger settings.
     *
     * Applies configuration to all channels and clears instance cache.
     *
     * @param config - Partial configuration to merge with defaults
     */
    public static configure(config: Partial<LoggerConfiguration>): void {
        LoggerChannelRegistry.instance.configure(config);
        this.instances.clear();
    }

    /**
     * Creates a new Logger instance.
     *
     * @param label - Prefix/label for all log entries from this logger
     * @param options - Optional configuration for channel, format, and ANSI handling
     */
    constructor(label: string, options?: LoggerOptions) {
        this.label = label;
        this.channel = options?.channel ?? this.registry.getDefaultChannel();
        this.logger = this.registry.get(this.channel).child({ label: this.label, channel: this.channel });

        this.utils = new LoggerUtilitiesAccessor(this);
    }

    /**
     * Switches this logger to a different channel.
     *
     * @param channel - Channel name to switch to
     */
    public setChannel(channel: string): void {
        this.channel = channel;
        this.logger = this.registry.get(channel).child({ label: this.label, channel });
    }

    /**
     * Logs an error message with optional additional data.
     *
     * @param msg - The error message to log
     * @param args - Additional data to include in the log entry
     */
    public error(msg: string, ...args: unknown[]): void {
        this.logger.error(msg, ...args);
    }

    /**
     * Logs a warning message with optional additional data.
     *
     * @param msg - The warning message to log
     * @param args - Additional data to include in the log entry
     */
    public warn(msg: string, ...args: unknown[]): void {
        this.logger.warn(msg, ...args);
    }

    /**
     * Logs an informational message with optional additional data.
     *
     * @param msg - The informational message to log
     * @param args - Additional data to include in the log entry
     */
    public info(msg: string, ...args: unknown[]): void {
        this.logger.info(msg, ...args);
    }

    /**
     * Logs an HTTP-related message with optional additional data.
     *
     * @param msg - The HTTP message to log
     * @param args - Additional data to include in the log entry
     */
    public http(msg: string, ...args: unknown[]): void {
        this.logger.http(msg, ...args);
    }

    /**
     * Logs a verbose message with optional additional data.
     *
     * @param msg - The verbose message to log
     * @param args - Additional data to include in the log entry
     */
    public verbose(msg: string, ...args: unknown[]): void {
        this.logger.verbose(msg, ...args);
    }

    /**
     * Logs a debug message with optional additional data.
     *
     * @param msg - The debug message to log
     * @param args - Additional data to include in the log entry
     */
    public debug(msg: string, ...args: unknown[]): void {
        this.logger.debug(msg, ...args);
    }

    /**
     * Logs a silly/trace level message with optional additional data.
     *
     * @param msg - The silly message to log
     * @param args - Additional data to include in the log entry
     */
    public silly(msg: string, ...args: unknown[]): void {
        this.logger.silly(msg, ...args);
    }

    /**
     * Static method to log an error message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The error message to log
     * @param args - Additional data to include in the log entry
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static Error(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.error(msg, ...args);
    }

    /**
     * Static method to log an informational message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The informational message to log
     * @param args - Additional data to include in the log entry
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static Info(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.info(msg, ...args);
    }

    /**
     * Static method to log a warning message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The warning message to log
     * @param args - Additional data to include in the log entry
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static Warn(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.warn(msg, ...args);
    }

    /**
     * Static method to log a debug message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The debug message to log
     * @param args - Additional data to include in the log entry
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static Debug(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.debug(msg, ...args);
    }

    /**
     * Static method to log a silly/trace level message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The silly message to log
     * @param args - Additional data to include in the log entry
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static Silly(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.silly(msg, ...args);
    }
}
