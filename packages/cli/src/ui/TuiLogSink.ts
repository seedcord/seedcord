import type { LogPanel } from './LogPanel';
import type { TUI } from './TUI';
import type { ILoggerSink, LoggerSinkLogEntry } from '@seedcord/services';

export class TuiLogSink implements ILoggerSink {
    public constructor(
        private readonly ui: TUI,
        private readonly sectionId: string,
        private readonly panel: LogPanel
    ) {}

    public onLog(entry: LoggerSinkLogEntry): void {
        const lines = entry.rendered.split(/\r?\n/);
        for (const line of lines) {
            this.panel.append(line, entry.channel);
        }
        this.ui.updateSection(this.sectionId, this.panel.renderLines());
    }
}
