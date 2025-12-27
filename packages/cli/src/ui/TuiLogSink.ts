import type { LogPanel } from './LogPanel';
import type { ILoggerSink, LoggerSinkLogEntry } from '@seedcord/services';

export class TuiLogSink implements ILoggerSink {
    public constructor(private readonly panel: LogPanel) {}

    public onLog(entry: LoggerSinkLogEntry): void {
        const lines = entry.rendered.split(/\r?\n/);
        for (const line of lines) {
            this.panel.append(line, entry.channel);
        }
    }
}
