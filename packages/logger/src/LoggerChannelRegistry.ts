import { defaultLevel, passesLevel } from './levels';
import { ObjectConsoleSink } from './ObjectConsoleSink';

import type { ILogSink, LogLevel, LogRecord, LoggerConfig, LogSinkHandle } from '@seedcord/types';

interface CaptureEntry {
    readonly sink: ILogSink;
    readonly muteConsole: boolean;
}

function defaultSinks(): ILogSink[] {
    return [new ObjectConsoleSink()];
}

function channelSinks(channels: NonNullable<LoggerConfig['channels']>): ILogSink[] {
    return Object.values(channels).flatMap((override) => override?.sinks ?? []);
}

/**
 * Process-global router for every {@link LogRecord}.
 *
 * Resolves the channel and level floor at log time, then runs two layers: config sinks (replaced
 * wholesale by `configure`) and capture sinks (installed imperatively, surviving a config
 * replace). A `console`-kind config sink is skipped while any capture requests `muteConsole`.
 */
export class LoggerChannelRegistry {
    private static _instance: LoggerChannelRegistry | null = null;

    private level: LogLevel = defaultLevel();
    private sinks: ILogSink[] = defaultSinks();
    private channels: NonNullable<LoggerConfig['channels']> = {};

    private nextCaptureId = 1;
    private readonly captures = new Map<number, CaptureEntry>();
    private readonly broken = new WeakSet<ILogSink>();

    public static get instance(): LoggerChannelRegistry {
        return (this._instance ??= new LoggerChannelRegistry());
    }

    /** Full-replaces the config layer. Omitted fields reset to their defaults. */
    public configure(config: LoggerConfig): void {
        const nextSinks = config.sinks ?? defaultSinks();
        const nextChannels = config.channels ?? {};
        const retained = new Set<ILogSink>([...nextSinks, ...channelSinks(nextChannels)]);
        // winston file handles close on dispose
        for (const sink of new Set([...this.sinks, ...channelSinks(this.channels)])) {
            if (!retained.has(sink)) sink.dispose?.();
        }
        this.level = config.level ?? defaultLevel();
        this.sinks = nextSinks;
        this.channels = nextChannels;
    }

    public dispatch(record: LogRecord): void {
        const override = this.channels[record.channel];
        if (!passesLevel(record.level, override?.level ?? this.level)) return;

        const muted = this.isConsoleMuted();
        for (const sink of override?.sinks ?? this.sinks) {
            if (muted && sink.kind === 'console') continue;
            this.emit(sink, record);
        }
        // eslint-disable-next-line unicorn/no-useless-spread -- snapshot so a capture installed mid-dispatch is skipped this pass
        for (const { sink } of [...this.captures.values()]) {
            this.emit(sink, record);
        }
    }

    private emit(sink: ILogSink, record: LogRecord): void {
        try {
            void Promise.resolve(sink.onLog(record)).catch((error: unknown) => {
                this.sinkFailed(sink, error);
            });
        } catch (error: unknown) {
            this.sinkFailed(sink, error);
        }
    }

    private sinkFailed(sink: ILogSink, error: unknown): void {
        if (this.broken.has(sink)) return;
        this.broken.add(sink);
        // eslint-disable-next-line no-console -- console because the log pipeline is the thing that broke
        console.error('[seedcord] a log sink threw, dropping its output for this process', error);
    }

    /** Installs a capture sink (the dev TUI, a remote drain). Survives a `configure` replace. */
    public installSink(sink: ILogSink, options?: { muteConsole?: boolean }): LogSinkHandle {
        const id = this.nextCaptureId++;
        this.captures.set(id, { sink, muteConsole: options?.muteConsole ?? false });
        const handle: LogSinkHandle = {
            dispose: () => void this.captures.delete(id),
            [Symbol.dispose]: () => handle.dispose()
        };
        return handle;
    }

    /** @internal */
    public reset(): void {
        // dispose the config-layer sinks so a reset after a live install closes winston handles
        for (const sink of new Set([...this.sinks, ...channelSinks(this.channels)])) sink.dispose?.();
        this.level = defaultLevel();
        this.sinks = defaultSinks();
        this.channels = {};
        this.captures.clear();
        this.nextCaptureId = 1;
    }

    private isConsoleMuted(): boolean {
        for (const entry of this.captures.values()) {
            if (entry.muteConsole) return true;
        }
        return false;
    }
}
