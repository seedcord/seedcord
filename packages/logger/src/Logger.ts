import { DEFAULT_CHANNEL } from './levels';
import { LoggerChannelRegistry } from './LoggerChannelRegistry';
import { LoggerUtilities } from './LoggerUtilities';

import type { LoggerOptions } from './types';
import type { ILogger, LogLevel, LoggerChannelId, LoggerConfig } from '@seedcord/types';

/**
 * Channel-aware logging service.
 *
 * Builds a plain {@link LogRecord} per call and dispatches it to the process-global
 * {@link LoggerChannelRegistry}. No transport is bound, so it runs on a gateway server and a
 * Cloudflare Worker without changes.
 */
export class Logger implements ILogger {
    private readonly label: string;
    private channel: LoggerChannelId;
    private readonly registry = LoggerChannelRegistry.instance;

    public readonly utils: LoggerUtilities;

    /** Full-replaces the global logger configuration. */
    public static configure(config: LoggerConfig): void {
        LoggerChannelRegistry.instance.configure(config);
    }

    /** @param label - Prefix on every entry from this logger. */
    constructor(label: string, options?: LoggerOptions) {
        this.label = label;
        this.channel = options?.channel ?? DEFAULT_CHANNEL;
        this.utils = new LoggerUtilities(this);
    }

    /** Switches this logger to a different channel. */
    public setChannel(channel: LoggerChannelId): void {
        this.channel = channel;
    }

    /** Returns a new logger for this label on the given channel. */
    public inChannel(channel: LoggerChannelId): Logger {
        return new Logger(this.label, { channel });
    }

    public error(msg: string, ...args: unknown[]): void {
        this.dispatch('error', msg, args);
    }

    public warn(msg: string, ...args: unknown[]): void {
        this.dispatch('warn', msg, args);
    }

    public info(msg: string, ...args: unknown[]): void {
        this.dispatch('info', msg, args);
    }

    public debug(msg: string, ...args: unknown[]): void {
        this.dispatch('debug', msg, args);
    }

    public trace(msg: string, ...args: unknown[]): void {
        this.dispatch('trace', msg, args);
    }

    private dispatch(level: LogLevel, message: string, args: unknown[]): void {
        this.registry.dispatch({
            level,
            message,
            label: this.label,
            channel: this.channel,
            timestamp: Date.now(),
            ...(args.length > 0 && { args })
        });
    }
}
