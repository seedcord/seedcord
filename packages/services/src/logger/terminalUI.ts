import ansiEscapes from 'ansi-escapes';
import logUpdate from 'log-update';
import ora, { type Ora } from 'ora';

import type { TerminalUIConfig } from './types';

interface LiveSection {
    id: string;
    lines: string[];
}

export class TerminalUI {
    private readonly sections = new Map<string, LiveSection>();
    private readonly updater = logUpdate;
    private statusLine: string | null = null;
    private spinner: Ora | null = null;

    constructor(private readonly config: TerminalUIConfig = {}) {}

    public clear(): void {
        this.updater.clear();
        process.stdout.write(ansiEscapes.clearScreen);
    }

    public setStatusLine(text: string | null): void {
        this.statusLine = text;
        this.render();
    }

    public createSection(id: string): void {
        if (!this.sections.has(id)) this.sections.set(id, { id, lines: [] });
    }

    public updateSection(id: string, lines: string[]): void {
        this.sections.set(id, { id, lines });
        this.render();
    }

    public removeSection(id: string): void {
        this.sections.delete(id);
        this.render();
    }

    public moveCursor(x: number, y: number): void {
        process.stdout.write(ansiEscapes.cursorMove(x, y));
    }

    public saveCursor(): void {
        process.stdout.write(ansiEscapes.cursorSavePosition);
    }

    public restoreCursor(): void {
        process.stdout.write(ansiEscapes.cursorRestorePosition);
    }

    public clearLine(): void {
        process.stdout.write(ansiEscapes.eraseLine);
    }

    public enterAlternateScreen(): void {
        if (!this.config.alternateScreen) return;
        process.stdout.write(ansiEscapes.enterAlternativeScreen);
    }

    public exitAlternateScreen(): void {
        if (!this.config.alternateScreen) return;
        process.stdout.write(ansiEscapes.exitAlternativeScreen);
    }

    public startSpinner(text: string): Ora {
        this.spinner = ora({ text }).start();
        return this.spinner;
    }

    public updateSpinner(text: string): void {
        if (this.spinner) this.spinner.text = text;
    }

    public stopSpinner(finalText?: string): void {
        if (!this.spinner) return;

        if (finalText) this.spinner.succeed(finalText);
        else this.spinner.stop();
        this.spinner = null;
    }

    private render(): void {
        const lines: string[] = [];
        for (const section of this.sections.values()) {
            lines.push(...section.lines);
        }

        if (this.statusLine) {
            lines.push('');
            lines.push(this.statusLine);
        }

        this.updater(lines.join('\n'));
    }
}
