import { TypedEventEmitter } from '@seedcord/event-emitter';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { formatBody } from '@seedcord/logger/node';

import type { ILogSink, LogLevel, LogRecord, LogSinkHandle } from '@seedcord/logger';

export interface LogEntry {
    id: number;
    channel: string;
    level: LogLevel;
    label: string;
    text: string;
    timestamp: number;
    head: boolean;
    frame: boolean;
}

const STACK_FRAME = /^\s+at\s/;

interface LogStoreEvents {
    change: [];
}

// 30ms keeps a noisy bot from re-rendering the log view once per line
const UPDATE_DEBOUNCE_MS = 30;

// eslint-disable-next-line no-magic-numbers -- 27 is the ESC control code
const ESC = String.fromCharCode(27);

export class LogStore extends TypedEventEmitter<LogStoreEvents> implements ILogSink {
    private static _instance: LogStore | null = null;

    public readonly kind = 'capture';

    private entries: LogEntry[] = [];
    private buffer: LogEntry[] = [];
    private nextId = 1;
    private sinkHandle: LogSinkHandle | null = null;
    private pendingUpdate = false;
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly MAX_LOGS = 1000;
    private readonly MAX_LABEL_WIDTH = 12;

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

    public onLog(record: LogRecord): void {
        // a lone \r left in a row sends the terminal cursor to column 0 and overwrites what it printed, and
        // every other control char corrupts the row the same way. ESC survives because SGR colors need it.
        const lines = formatBody(record).split(/\r\n|\r|\n/);

        for (const [index, line] of lines.entries()) {
            const text = line.replaceAll(/\p{Cc}/gu, (char) => (char === ESC ? char : ''));
            this.buffer.push({
                id: this.nextId++,
                channel: record.channel,
                level: record.level,
                label: record.label,
                head: index === 0,
                frame: index > 0 && STACK_FRAME.test(text),
                text,
                timestamp: record.timestamp
            });
        }

        this.scheduleUpdate();
    }

    // useSyncExternalStore needs a stable reference, so channel filtering stays in useLogs
    public getLogs(): readonly LogEntry[] {
        return this.entries;
    }

    // read off live entries, else the toggle list carries an empty "default" row
    public getChannels(): readonly string[] {
        const seen = new Set<string>();
        for (const entry of this.entries) seen.add(entry.channel);
        return [...seen].sort();
    }

    public getLabelWidth(): number {
        let width = 0;
        for (const entry of this.entries) if (entry.label.length > width) width = entry.label.length;
        return Math.min(width, this.MAX_LABEL_WIDTH);
    }

    public clear(): void {
        this.entries = [];
        this.buffer = [];
        this.emit('change');
    }

    // the yield gives ink one paint of the last lines before quit unmounts the ui
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
