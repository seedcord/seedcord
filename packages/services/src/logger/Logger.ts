import { LoggerChannelRegistry } from './channel';
import { LoggerUtilitiesAccessor } from './utilities';

import type { LoggerConfiguration, LoggerOptions } from './types';
import type { ILogger } from '@seedcord/types';
import type { Logger as Winston } from 'winston';

/**
 * Public logging service with channel-aware transports and per-run file output.
 *
 * Backward compatible API that now supports:
 * - Channel separation (e.g., bot, cli, hmr)
 * - Production-safe JSON logs with ANSI stripping
 * - Unique log files per run via filename templates
 *
 * Common utilities are accessed via the `utils` property:
 * - `logger.utils.summary(title, items)` - Log key-value pairs
 * - `logger.utils.list(items, heading)` - Log a list of items
 * - `logger.utils.registration(name, path, type)` - Log component registration
 * - `logger.utils.initialization(name, action)` - Log init start/end
 * - `logger.utils.progress(current, total)` - Log progress
 * - `logger.utils.box(title, content)` - Log in a decorative box
 */
export class Logger implements ILogger {
    declare private logger: Winston;
    private readonly label: string;
    private channel: string;
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

    public static configure(config: Partial<LoggerConfiguration>): void {
        LoggerChannelRegistry.configure(config);
        this.instances.clear();
    }

    constructor(label: string, options?: LoggerOptions) {
        this.label = label;
        this.channel = options?.channel ?? LoggerChannelRegistry.getDefaultChannel();
        this.logger = LoggerChannelRegistry.get(this.channel).child({ label: this.label });
        this.utils = new LoggerUtilitiesAccessor(this);
    }

    public setChannel(channel: string): void {
        this.channel = channel;
        this.logger = LoggerChannelRegistry.get(channel).child({ label: this.label });
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
