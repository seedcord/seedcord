import { defaultLevel, passesLevel } from './levels';
import { ObjectConsoleSink } from './ObjectConsoleSink';

import type { ILogSink, LogLevel, LogRecord, LoggerConfig, LogSinkHandle } from './types';

interface CaptureEntry {
    readonly sink: ILogSink;
    readonly muteConsole: boolean;
}

function defaultSinks(): ILogSink[] {
    return [new ObjectConsoleSink()];
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

    public static get instance(): LoggerChannelRegistry {
        return (this._instance ??= new LoggerChannelRegistry());
    }

    /** Full-replaces the config layer. Omitted fields reset to their defaults. */
    public configure(config: LoggerConfig): void {
        const next = config.sinks ?? defaultSinks();
        for (const sink of this.sinks) if (!next.includes(sink)) sink.dispose?.();
        this.level = config.level ?? defaultLevel();
        this.sinks = next;
        this.channels = config.channels ?? {};
    }

    public dispatch(record: LogRecord): void {
        const override = this.channels[record.channel];
        if (!passesLevel(record.level, override?.level ?? this.level)) return;

        const muted = this.isConsoleMuted();
        for (const sink of override?.sinks ?? this.sinks) {
            if (muted && sink.kind === 'console') continue;
            sink.onLog(record);
        }
        // eslint-disable-next-line unicorn/no-useless-spread -- snapshot so a capture installed mid-dispatch is skipped this pass
        for (const { sink } of [...this.captures.values()]) {
            sink.onLog(record);
        }
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
