import type { ILogger } from './ILogger';
import type { LiteralUnion } from 'type-fest';

/** Severity of a log record, highest to lowest. */
export type LogLevel = keyof ILogger;

/** Channels the framework logs on. They're reserved as well */
export type FrameworkChannel =
    | 'default'
    | 'bot'
    | 'lifecycle'
    | 'health'
    | 'interactions'
    | 'events'
    | 'commands'
    | 'subscribers'
    | 'errors'
    | 'gates'
    | 'plugins'
    | 'hmr'
    | 'cli'
    | 'tsc';

/** A log channel. */
export type LoggerChannelId = LiteralUnion<FrameworkChannel, string>;

/** A single log entry the core builds and passes to every sink. */
export interface LogRecord {
    level: LogLevel;
    message: string;
    label: string;
    channel: LoggerChannelId;
    timestamp: number;
    /** The `...args` after the message, unformatted. */
    args?: unknown[];
}

type LogSinkKind = 'console' | 'file' | 'capture';

/** A destination for log records. */
export interface ILogSink {
    /**
     * A `'console'` sink stops getting records while a capture sink that mutes the console is installed,
     * like the dev terminal's. `'file'` and `'capture'` sinks keep getting them.
     */
    readonly kind: LogSinkKind;
    /** Can be async. seedcord doesn't await it, and an edge bot keeps the request open until it finishes. */
    onLog(record: LogRecord): unknown;
    /** Runs when a later logger config doesn't include this sink. Close a file handle or a connection here. */
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
    channels?: Partial<Record<LoggerChannelId, ChannelOverride>>;
}

/** Handle returned by `installSink`. It works with `using` since it's Disposable. */
export interface LogSinkHandle {
    dispose(): void;
    [Symbol.dispose](): void;
}
