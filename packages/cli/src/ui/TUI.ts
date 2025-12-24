import ansiEscapes from 'ansi-escapes';

import { OutputCapture } from './internal/OutputCapture';
import { Renderer } from './internal/Renderer';
import { Sections } from './internal/Sections';
import { Spinner } from './internal/Spinner';
import { LogPanel } from './LogPanel';

import type { TuiConfig, TuiLogPanelOptions, TuiSectionOptions } from './types';

const DEFAULT_SPINNER_INTERVAL_MS = 80;
const DEFAULT_CAPTURED_MAX_LINES = 400;

function resolveCaptureConfig(value: TuiConfig['captureOutput']): { stdout: boolean; stderr: boolean } {
    if (!value) return { stdout: false, stderr: false };
    if (value === true) return { stdout: true, stderr: true };

    const v = value;
    return { stdout: v.stdout ?? true, stderr: v.stderr ?? true };
}

export class TUI {
    private readonly stream: NodeJS.WriteStream;
    private readonly sections = new Sections();

    private renderer: Renderer | null = null;

    private statusLine: string | null = null;

    private spinner: Spinner | null = null;
    private spinnerTick: NodeJS.Timeout | null = null;

    private readonly capture = new OutputCapture();
    private captureEnabled = false;

    private outputPanel: { sectionId: string; panel: LogPanel } | null = null;

    public constructor(private readonly config: TuiConfig = {}) {
        this.stream = config.stream ?? process.stderr;
    }

    public activate(): void {
        if (this.renderer) return;

        const captureToggles = resolveCaptureConfig(this.config.captureOutput);
        const shouldCapture = captureToggles.stdout || captureToggles.stderr;

        let stdoutRaw = process.stdout.write.bind(process.stdout) as (text: string) => boolean;
        let stderrRaw = process.stderr.write.bind(process.stderr) as (text: string) => boolean;

        if (shouldCapture) {
            const installed = this.capture.install(captureToggles, {
                onStdoutLine: (line) => this.onCapturedLine(line),
                onStderrLine: (line) => this.onCapturedLine(line)
            });

            stdoutRaw = installed.stdoutRaw as (text: string) => boolean;
            stderrRaw = installed.stderrRaw as (text: string) => boolean;
            this.captureEnabled = true;
        }

        const rawWrite = (text: string): void => {
            const writer = this.stream === process.stdout ? stdoutRaw : stderrRaw;
            writer(text);
        };

        this.renderer = new Renderer(this.stream, rawWrite);

        if (this.stream.isTTY) {
            this.renderer.hideCursor();
        }

        if (this.config.alternateScreen) {
            this.renderer.enterAlternateScreen();
        }

        this.render();
    }

    public deactivate(): void {
        this.stopSpinner();

        if (this.config.alternateScreen) {
            this.renderer?.exitAlternateScreen();
        }

        this.renderer?.dispose();
        this.renderer = null;

        if (this.captureEnabled) {
            this.capture.uninstall();
            this.captureEnabled = false;
        }
    }

    public clear(): void {
        this.stopSpinner();
        this.sectionsCreateIfMissing('root');
        this.sections.clear('root');
        this.statusLine = null;
        this.outputPanel = null;

        this.renderer?.clearRenderedRegion();
    }

    public refresh(): void {
        this.render();
    }

    public createSection(id: string, options?: TuiSectionOptions): void {
        this.sections.create(id, options);
        this.render();
    }

    public updateSection(id: string, lines: readonly string[]): void {
        this.sections.set(id, lines);
        this.render();
    }

    public clearSection(id: string): void {
        this.sections.clear(id);
        this.render();
    }

    public removeSection(id: string): void {
        this.sections.remove(id);
        this.render();
    }

    public setStatusLine(text: string | null): void {
        this.statusLine = text;
        this.render();
    }

    public startSpinner(text: string): void {
        this.stopSpinner();

        this.spinner = new Spinner(text);

        const interval = this.config.spinnerIntervalMs ?? DEFAULT_SPINNER_INTERVAL_MS;
        this.spinnerTick = setInterval(() => this.render(), interval);
        this.render();
    }

    public updateSpinner(text: string): void {
        if (this.spinner) this.spinner.text = text;
        this.render();
    }

    public stopSpinner(finalStatus?: string): void {
        if (this.spinnerTick) {
            clearInterval(this.spinnerTick);
            this.spinnerTick = null;
        }

        this.spinner = null;

        if (finalStatus !== undefined) {
            this.statusLine = finalStatus;
        }

        this.render();
    }

    public attachLogPanel(sectionId: string, initialChannel: string, options?: TuiLogPanelOptions): LogPanel {
        const panel = new LogPanel(initialChannel, options);
        this.outputPanel = { sectionId, panel };
        this.updateSection(sectionId, panel.renderLines());
        return panel;
    }

    public moveCursor(x: number, y: number): void {
        this.renderer?.render('');
        const w = this.renderer ? this.stream.write.bind(this.stream) : this.stream.write.bind(this.stream);
        w(ansiEscapes.cursorMove(x, y));
    }

    private onCapturedLine(line: string): void {
        if (!this.outputPanel) return;

        const max = this.config.capturedMaxLines ?? DEFAULT_CAPTURED_MAX_LINES;

        this.outputPanel.panel.append(line);

        const rendered = this.outputPanel.panel.renderLines();
        const trimmed = rendered.slice(0, Math.max(1, max));

        this.sections.set(this.outputPanel.sectionId, trimmed);
        this.render();
    }

    private render(): void {
        const renderer = this.renderer;
        if (!renderer) return;

        const snapshots = this.sections.snapshotOrdered();
        const lines: string[] = [];

        for (const s of snapshots) {
            lines.push(...s.lines);
        }

        const showStatusLine = this.config.statusLine !== false;
        if (showStatusLine) {
            const status = this.statusLine;

            if (status || this.spinner) {
                lines.push('');

                if (this.spinner && status) {
                    lines.push(`${this.spinner.frame()} ${status}`);
                } else if (this.spinner) {
                    lines.push(`${this.spinner.frame()} ${this.spinner.text}`);
                } else if (status) {
                    lines.push(status);
                }
            }
        }

        renderer.render(lines.join('\n'));
    }

    private sectionsCreateIfMissing(id: string): void {
        this.sections.create(id);
    }
}
