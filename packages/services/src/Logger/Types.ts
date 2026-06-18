import type { ILogger } from '@seedcord/types';
import type { Writable } from 'node:stream';
import type { Logger as WinstonLogger, transport } from 'winston';

/** Log level defining severity of a message */
export type LoggerLevel = keyof ILogger;

/** Format mode for log output */
export type LoggerFormatMode = 'pretty' | 'json' | 'minimal';

/**
 * Base configuration shared by all transport types.
 */
export interface BaseTransportConfig {
    /** Minimum log level for this transport */
    level?: LoggerLevel;
    /** Output format mode */
    format?: LoggerFormatMode;
    /** Whether to strip ANSI color codes from output */
    stripAnsi?: boolean;
}

/**
 * Console transport configuration.
 *
 * Logs to stdout/stderr for terminal output.
 */
export interface ConsoleTransportConfig extends BaseTransportConfig {
    /** Transport type */
    type: 'console';
}

/**
 * File transport configuration.
 *
 * Logs to rotating files with automatic directory creation.
 */
export interface FileTransportConfig extends BaseTransportConfig {
    /** Transport type */
    type: 'file';
    /** File path (supports `{channel}`, `{date}`, `{timestamp}` placeholders) */
    filename?: string;
    /** Maximum file size in bytes before rotation */
    maxSize?: number;
    /** Maximum number of rotated log files to keep */
    maxFiles?: number;
}

/**
 * Stream transport configuration.
 *
 * Logs to any writable stream for custom destinations.
 * Use this for logging to databases, network sockets, or custom handlers.
 */
export interface StreamTransportConfig extends BaseTransportConfig {
    /** Transport type */
    type: 'stream';
    /** Writable stream to log to */
    stream: Writable;
}

/**
 * Configuration for a logger transport.
 *
 * Discriminated union ensuring type-safe transport configuration.
 */
export type TransportConfig = ConsoleTransportConfig | FileTransportConfig | StreamTransportConfig;

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

export interface LoggerFilePatternsConfig {
    /** Filename pattern for development logs */
    dev: string;
    /** Filename pattern for staging logs */
    staging: string;
    /** Filename pattern for production logs */
    prod: string;
}

/* General configs for FileTransports in the logger */
export interface LoggerFileConfig {
    /** Maximum file size in MB for log rotation */
    maxSizeMB: number;
    /** Maximum number of log files to retain */
    maxFiles: number;
    /** Filename patterns for different environments */
    patterns: LoggerFilePatternsConfig;
}

/**
 * Global logger configuration.
 */
export interface LoggerConfiguration {
    /** Name of the default channel to use when none is specified */
    defaultChannel: string;
    /* General configs for FileTransports in the logger */
    files: LoggerFileConfig;
    /** Channel configurations keyed by channel name */
    channels: Record<string, ChannelConfig>;
}

/**
 * Options for creating a Logger instance.
 */
export interface LoggerOptions {
    /**
     * Channel to log to.
     *
     * @defaultValue the configured default channel
     */
    channel?: string;
    /** Format mode for output */
    format?: LoggerFormatMode;
    /** Whether to strip ANSI color codes */
    stripAnsi?: boolean;
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
