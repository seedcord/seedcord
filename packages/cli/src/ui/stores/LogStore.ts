import { EventEmitter } from 'node:events';

import { LoggerChannelRegistry } from '@seedcord/services';

import type { ILoggerSink, ILoggerSinkHandle, LoggerSinkLogEntry } from '@seedcord/services';

export interface LogEntry {
    id: number;
    channel: string;
    text: string;
    timestamp: number;
}

export class LogStore extends EventEmitter implements ILoggerSink {
    private static _instance: LogStore | null = null;

    private entries: LogEntry[] = [];
    private nextId = 1;
    private sinkHandle: ILoggerSinkHandle | null = null;
    private pendingUpdate = false;
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
        // Split multiline logs into separate entries for easier rendering
        const lines = entry.rendered.split(/\r?\n/);
        const now = Date.now();

        for (const line of lines) {
            this.entries.push({
                id: this.nextId++,
                channel: entry.channel,
                text: line,
                timestamp: now
            });
        }

        if (this.entries.length > this.MAX_LOGS) {
            this.entries = this.entries.slice(-this.MAX_LOGS);
        }

        this.scheduleUpdate();
    }

    public getLogs(channel?: string): readonly LogEntry[] {
        if (!channel) return this.entries;
        return this.entries.filter((e) => e.channel === channel);
    }

    public clear(channel?: string): void {
        if (channel) {
            this.entries = this.entries.filter((e) => e.channel !== channel);
        } else {
            this.entries = [];
        }
        this.emit('change');
    }

    private scheduleUpdate(): void {
        if (this.pendingUpdate) return;
        this.pendingUpdate = true;
        const fpsCap = 32;

        // Throttle updates to ~30fps to keep UI responsive under load
        setTimeout(() => {
            this.pendingUpdate = false;
            this.emit('change');
        }, fpsCap);
    }
}
