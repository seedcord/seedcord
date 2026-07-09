import type { ILogger } from '@seedcord/types';

/** Severity of a log record, highest to lowest. */
export type LogLevel = keyof ILogger;

/** A single log entry the core builds and hands to every sink. */
export interface LogRecord {
    level: LogLevel;
    message: string;
    label: string;
    channel: string;
    timestamp: number;
    /** The `...args` after the message, unformatted. */
    args?: unknown[];
}

// dispatch skips a 'console' sink while the console is muted
type LogSinkKind = 'console' | 'file' | 'capture';

/** A destination for log records. */
export interface ILogSink {
    readonly kind: LogSinkKind;
    /** `true` for a sink that reaches node built-ins, so the edge deploy gate refuses it. */
    readonly node?: boolean;
    onLog(record: LogRecord): void;
    dispose?(): void;
}

/** Per-channel level and sink overrides. */
interface ChannelOverride {
    level?: LogLevel;
    sinks?: ILogSink[];
}

/** Global logger configuration. Passing it full-replaces the config layer. */
export interface LoggerConfig {
    /** Global floor. Defaults from the environment. */
    level?: LogLevel;
    /** Config-layer sinks. Defaults to a single console sink. */
    sinks?: ILogSink[];
    /** Per-channel level or sink overrides. */
    channels?: Record<string, ChannelOverride>;
}

/** Options for a {@link Logger} instance. */
export interface LoggerOptions {
    /** @defaultValue `'default'` */
    channel?: string;
}

/** Handle returned by an installed capture sink. Disposable, so it works with `using`. */
export interface LogSinkHandle {
    dispose(): void;
    [Symbol.dispose](): void;
}
