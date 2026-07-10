import type { ILogger } from './ILogger';

/** Severity of a log record, highest to lowest. */
export type LogLevel = keyof ILogger;

/** A single log entry the core builds and passes to every sink. */
export interface LogRecord {
    level: LogLevel;
    message: string;
    label: string;
    channel: string;
    timestamp: number;
    /** The `...args` after the message, unformatted. */
    args?: unknown[];
}

type LogSinkKind = 'console' | 'file' | 'capture';

/** A destination for log records. `kind` controls dispatch routing, `node: true` marks a node-only sink. */
export interface ILogSink {
    readonly kind: LogSinkKind;
    readonly node?: boolean;
    onLog(record: LogRecord): void;
    dispose?(): void;
}

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

/** Handle returned by `installSink`. Disposable, so it works with `using`. */
export interface LogSinkHandle {
    dispose(): void;
    [Symbol.dispose](): void;
}
