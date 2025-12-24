import type { Logger as WinstonLogger, transport } from 'winston';

export type LoggerLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
export type LoggerFormatMode = 'pretty' | 'json' | 'minimal';

export interface TransportConfig {
    type: 'console' | 'file';
    level?: LoggerLevel;
    filename?: string;
    format?: LoggerFormatMode;
    stripAnsi?: boolean;
    maxSize?: number;
    maxFiles?: number;
}

export interface ChannelConfig {
    name: string;
    level?: LoggerLevel;
    transports?: TransportConfig[];
    format?: LoggerFormatMode;
    stripAnsi?: boolean;
}

export interface LoggerConfiguration {
    defaultChannel: string;
    channels: Record<string, ChannelConfig>;
    devFilePattern: string;
    prodFilePattern: string;
    fileMaxSizeMB: number;
    fileMaxFiles: number;
}

export interface LoggerOptions {
    channel?: string;
    format?: LoggerFormatMode;
    stripAnsi?: boolean;
}

export interface TerminalUIConfig {
    statusLine?: boolean;
    alternateScreen?: boolean;
}

export interface LiveSectionState {
    id: string;
    lines: string[];
}

export type WinstonTransport = transport;
export type WinstonInstance = WinstonLogger;
