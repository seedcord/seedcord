import type { Logger as WinstonLogger, transport } from 'winston';

/** Log level defining severity of a message */
export type LoggerLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/** Format mode for log output */
export type LoggerFormatMode = 'pretty' | 'json' | 'minimal';

/**
 * Configuration for a logger transport (console or file).
 */
export interface TransportConfig {
    /** Transport type: console or file output */
    type: 'console' | 'file';
    /** Minimum log level for this transport */
    level?: LoggerLevel;
    /** File path for file transports (supports `{channel}`, `{date}`, `{timestamp}` placeholders) */
    filename?: string;
    /** Output format mode */
    format?: LoggerFormatMode;
    /** Whether to strip ANSI color codes from output */
    stripAnsi?: boolean;
    /** Maximum file size in bytes before rotation */
    maxSize?: number;
    /** Maximum number of rotated log files to keep */
    maxFiles?: number;
}

/**
 * Configuration for a named logger channel.
 */
export interface ChannelConfig {
    /** Channel identifier */
    name: string;
    /** Default log level for the channel */
    level?: LoggerLevel;
    /** List of transports for this channel */
    transports?: TransportConfig[];
    /** Default format for the channel */
    format?: LoggerFormatMode;
    /** Whether to strip ANSI codes by default */
    stripAnsi?: boolean;
}

/**
 * Global logger configuration.
 */
export interface LoggerConfiguration {
    /** Name of the default channel to use when none is specified */
    defaultChannel: string;
    /** Channel configurations keyed by channel name */
    channels: Record<string, ChannelConfig>;
    /** Filename pattern for development logs */
    devFilePattern: string;
    /** Filename pattern for staging logs */
    stagingFilePattern: string;
    /** Filename pattern for production logs */
    prodFilePattern: string;
    /** Maximum file size in MB for log rotation */
    fileMaxSizeMB: number;
    /** Maximum number of log files to retain */
    fileMaxFiles: number;
}

/**
 * Options for creating a Logger instance.
 */
export interface LoggerOptions {
    /** Channel to log to (defaults to configured default channel) */
    channel?: string;
    /** Format mode for output */
    format?: LoggerFormatMode;
    /** Whether to strip ANSI color codes */
    stripAnsi?: boolean;
}

/**
 * Configuration for terminal UI features.
 */
export interface TerminalUIConfig {
    /** Enable persistent status line at bottom of terminal */
    statusLine?: boolean;
    /** Use alternate screen buffer for terminal output */
    alternateScreen?: boolean;
}

/**
 * Winston transport type re-export.
 * @internal
 */
export type WinstonTransport = transport;

/**
 * Winston logger instance type re-export.
 * @internal
 */
export type WinstonInstance = WinstonLogger;
