import TransportStream from 'winston-transport';

import type { Logform } from 'winston';
import type { TransportStreamOptions } from 'winston-transport';

export interface SinkTransportOptions extends TransportStreamOptions {
    readonly channel: string;
    readonly sink: ILoggerSink;
}

export interface LoggerSinkLogEntry {
    readonly channel: string;
    readonly rendered: string;
    readonly info: Logform.TransformableInfo;
}

export interface ILoggerSink {
    onLog(entry: LoggerSinkLogEntry): void;
}

export interface ILoggerSinkHandle {
    dispose(): void;
}

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
        const record = info as unknown as Record<string, unknown>;
        const channel = record.channel;
        return typeof channel === 'string' ? channel : this.channelName;
    }

    private resolveRendered(info: Logform.TransformableInfo): string {
        const record = info as unknown as Record<string | symbol, unknown>;
        const msg = record[Symbol.for('message')];

        if (typeof msg === 'string') return msg;

        const fallback = (info as unknown as Record<string, unknown>).message;
        if (typeof fallback === 'string') return fallback;

        if (fallback instanceof Error) return fallback.stack ?? fallback.message;

        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return String(fallback ?? '');
    }
}
