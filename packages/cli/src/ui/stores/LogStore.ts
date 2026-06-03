import { LoggerChannelRegistry, StrictEventEmitter } from '@seedcord/services';

import type { ILoggerSink, ILoggerSinkHandle, LoggerSinkLogEntry } from '@seedcord/services';

export interface LogEntry {
    id: number;
    channel: string;
    text: string;
    timestamp: number;
}

interface LogStoreEvents {
    change: [];
}

// Buffered log batches flush on this debounce so a noisy bot doesn't re-render the log view per line.
const UPDATE_DEBOUNCE_MS = 30;

// eslint-disable-next-line no-magic-numbers -- 27 is the ESC control code
const ESC = String.fromCharCode(27);

export class LogStore extends StrictEventEmitter<LogStoreEvents> implements ILoggerSink {
    private static _instance: LogStore | null = null;

    private entries: LogEntry[] = [];
    private buffer: LogEntry[] = [];
    private nextId = 1;
    private sinkHandle: ILoggerSinkHandle | null = null;
    private pendingUpdate = false;
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly MAX_LOGS = 1000;

    private constructor() {
        super();
    }

    public static get instance(): LogStore {
        LogStore._instance ??= new LogStore();
        return LogStore._instance;
    }

    public mount(): void {
        if (this.sinkHandle) return;
        this.sinkHandle = LoggerChannelRegistry.instance.installSink(this, {
            muteConsole: true
        });
    }

    public unmount(): void {
        if (!this.sinkHandle) return;
        this.sinkHandle.dispose();
        this.sinkHandle = null;
    }

    public onLog(entry: LoggerSinkLogEntry): void {
        // Split on a lone \r too: a bare carriage return left in a row resets the terminal cursor to column 0
        // on print and overwrites the start of the line. Then drop any other control char (keeping ESC so SGR
        // color sequences still render) for the same corruption reason.
        const lines = entry.rendered.split(/\r\n|\r|\n/);
        const now = Date.now();

        for (const line of lines) {
            this.buffer.push({
                id: this.nextId++,
                channel: entry.channel,
                text: line.replace(/\p{Cc}/gu, (char) => (char === ESC ? char : '')),
                timestamp: now
            });
        }

        this.scheduleUpdate();
    }

    // Stays a stable reference for useSyncExternalStore; channel filtering happens in useLogs.
    public getLogs(): readonly LogEntry[] {
        return this.entries;
    }

    // Source channels from real log entries, not the registry, so the toggle list never shows an empty
    // "default" placeholder.
    public getChannels(): readonly string[] {
        const seen = new Set<string>();
        for (const entry of this.entries) seen.add(entry.channel);
        return [...seen].sort();
    }

    public clear(): void {
        this.entries = [];
        this.buffer = [];
        this.emit('change');
    }

    // Drain buffered logs immediately and yield once so Ink paints the final lines before a quit unmounts the UI.
    public async flush(): Promise<void> {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        this.applyBuffer();
        await new Promise<void>((resolve) => setImmediate(resolve));
    }

    private scheduleUpdate(): void {
        if (this.pendingUpdate) return;
        this.pendingUpdate = true;
        this.flushTimer = setTimeout(() => this.applyBuffer(), UPDATE_DEBOUNCE_MS);
    }

    private applyBuffer(): void {
        this.flushTimer = null;
        this.pendingUpdate = false;
        if (this.buffer.length === 0) return;

        const newEntries = [...this.entries, ...this.buffer];
        this.buffer = [];
        this.entries = newEntries.length > this.MAX_LOGS ? newEntries.slice(-this.MAX_LOGS) : newEntries;

        this.emit('change');
    }
}
