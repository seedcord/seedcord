import TransportStream from 'winston-transport';

import type { Logform } from 'winston';
import type { TransportStreamOptions } from 'winston-transport';

/**
 * Options for creating a SinkTransport.
 * @internal
 */
export interface SinkTransportOptions extends TransportStreamOptions {
    readonly channel: string;
    readonly sink: ILoggerSink;
}

/**
 * A log entry passed to custom sinks.
 */
export interface LoggerSinkLogEntry {
    /** Channel the log originated from */
    readonly channel: string;
    /** Pre-formatted log message ready for display */
    readonly rendered: string;
    /** Raw Winston log info object */
    readonly info: Logform.TransformableInfo;
}

/**
 * Custom sink interface for capturing logger output.
 *
 * Implement this to route logs to custom destinations.
 */
export interface ILoggerSink {
    /**
     * Called when a log entry is emitted.
     *
     * @param entry - The log entry with channel, rendered message, and raw info
     */
    onLog(entry: LoggerSinkLogEntry): void;
}

/**
 * Handle for managing a sink's lifecycle.
 */
export interface ILoggerSinkHandle {
    /**
     * Removes the sink and restores console output if muted.
     */
    dispose(): void;
}

/**
 * Winston transport that forwards logs to custom sinks.
 * @internal
 */
export class SinkTransport extends TransportStream {
    private readonly channelName: string;
    private readonly sink: ILoggerSink;

    public constructor(options: SinkTransportOptions) {
        super(options);
        this.channelName = options.channel;
        this.sink = options.sink;
    }

    public override log(info: Logform.TransformableInfo, callback: () => void): void {
        setImmediate(() => this.emit('logged', info));

        const rendered = this.resolveRendered(info);
        const channel = this.resolveChannel(info);

        this.sink.onLog({ channel, rendered, info });

        callback();
    }

    private resolveChannel(info: Logform.TransformableInfo): string {
        const channel = info.channel;
        return typeof channel === 'string' ? channel : this.channelName;
    }

    private resolveRendered(info: Logform.TransformableInfo): string {
        const msg = info[Symbol.for('message')];

        if (typeof msg === 'string') return msg;

        const fallback = info.message;
        if (typeof fallback === 'string') return fallback;

        if (fallback instanceof Error) return fallback.stack ?? fallback.message;

        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- last-resort stringify for a non-string, non-Error message value
        return String(fallback ?? '');
    }
}
