import ansiEscapes from 'ansi-escapes';
import { render, type Instance } from 'ink';

import { OutputCapture } from './internal/OutputCapture';
import { Spinner } from './internal/Spinner';
import { LogPanel } from './LogPanel';
import { TuiApp } from './TuiApp';
import { TuiStore } from './TuiStore';

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
    private readonly store: TuiStore;

    private inkApp: Instance | null = null;

    private spinner: Spinner | null = null;
    private spinnerTick: NodeJS.Timeout | null = null;

    private readonly capture = new OutputCapture();
    private captureEnabled = false;

    private cursorHidden = false;
    private alternateScreenActive = false;

    private outputPanel: { sectionId: string; panel: LogPanel } | null = null;

    public constructor(private readonly config: TuiConfig = {}) {
        this.stream = config.stream ?? process.stderr;
        this.store = new TuiStore(config);
    }

    public activate(): void {
        if (this.inkApp) return;

        const captureToggles = resolveCaptureConfig(this.config.captureOutput);
        const shouldCapture = captureToggles.stdout || captureToggles.stderr;

        if (shouldCapture) {
            this.capture.install(captureToggles, {
                onStdoutLine: (line) => this.onCapturedLine(line),
                onStderrLine: (line) => this.onCapturedLine(line)
            });
            this.captureEnabled = true;
        }

        if (this.stream.isTTY) {
            this.stream.write(ansiEscapes.cursorHide);
            this.cursorHidden = true;
        }

        if (this.config.alternateScreen) {
            this.stream.write(ansiEscapes.enterAlternativeScreen);
            this.alternateScreenActive = true;
        }

        this.inkApp = render(<TuiApp store={this.store} />, {
            stdout: this.stream,
            stderr: process.stderr,
            stdin: process.stdin,
            exitOnCtrlC: true,
            patchConsole: false
        });
    }

    public deactivate(clearOnDeactivate = true): void {
        this.stopSpinner();

        if (this.inkApp) {
            if (clearOnDeactivate) this.inkApp.clear();
            this.inkApp.unmount();
            void this.inkApp.waitUntilExit();
            this.inkApp = null;
        }

        if (this.alternateScreenActive) {
            this.stream.write(ansiEscapes.exitAlternativeScreen);
            this.alternateScreenActive = false;
        }

        if (this.cursorHidden) {
            this.stream.write(ansiEscapes.cursorShow);
            this.cursorHidden = false;
        }

        if (this.captureEnabled) {
            this.capture.uninstall();
            this.captureEnabled = false;
        }
    }

    public clear(): void {
        this.stopSpinner();
        this.outputPanel = null;
        this.store.resetSections();
        this.store.createSection('root');
        this.store.clearSection('root');
        this.store.setStatusLine(null);
    }

    public refresh(): void {
        this.store.refresh();
    }

    public createSection(id: string, options?: TuiSectionOptions): void {
        this.store.createSection(id, options);
    }

    public updateSection(id: string, lines: readonly string[]): void {
        this.store.setSection(id, lines);
    }

    public clearSection(id: string): void {
        this.store.clearSection(id);
    }

    public removeSection(id: string): void {
        this.store.removeSection(id);
    }

    public setStatusLine(text: string | null): void {
        this.store.setStatusLine(text);
    }

    public startSpinner(text: string): void {
        this.stopSpinner();

        this.spinner = new Spinner(text);
        this.updateSpinnerState();

        const interval = this.config.spinnerIntervalMs ?? DEFAULT_SPINNER_INTERVAL_MS;
        this.spinnerTick = setInterval(() => {
            if (!this.spinner) return;
            this.spinner.advance();
            this.updateSpinnerState();
        }, interval);
    }

    public updateSpinner(text: string): void {
        if (!this.spinner) return;
        this.spinner.text = text;
        this.updateSpinnerState();
    }

    public stopSpinner(finalStatus?: string): void {
        if (this.spinnerTick) {
            clearInterval(this.spinnerTick);
            this.spinnerTick = null;
        }

        this.spinner = null;
        this.store.setSpinnerState(null);

        if (finalStatus !== undefined) {
            this.store.setStatusLine(finalStatus);
        }
    }

    public attachLogPanel(sectionId: string, initialChannel: string, options?: TuiLogPanelOptions): LogPanel {
        const panel = new LogPanel(initialChannel, options);

        panel.setOnChange((lines) => this.handlePanelUpdate(sectionId, panel, lines));

        this.outputPanel = { sectionId, panel };
        this.handlePanelUpdate(sectionId, panel, panel.renderLines());

        return panel;
    }

    public moveCursor(x: number, y: number): void {
        this.stream.write(ansiEscapes.cursorTo(x, y));
    }

    private handlePanelUpdate(sectionId: string, panel: LogPanel, lines: readonly string[]): void {
        const isCapturedPanel = this.outputPanel?.panel === panel;

        if (isCapturedPanel) {
            const max = this.config.capturedMaxLines ?? DEFAULT_CAPTURED_MAX_LINES;
            const trimmed = lines.slice(0, Math.max(1, max));
            this.store.setSection(sectionId, trimmed);
            return;
        }

        this.store.setSection(sectionId, lines);
    }

    private onCapturedLine(line: string): void {
        const panelBinding = this.outputPanel;
        if (!panelBinding) return;

        panelBinding.panel.append(line);
    }

    private updateSpinnerState(): void {
        if (!this.spinner) {
            this.store.setSpinnerState(null);
            return;
        }

        this.store.setSpinnerState({ frame: this.spinner.current(), text: this.spinner.text });
    }
}
