import ansiEscapes from 'ansi-escapes';
import logUpdate from 'log-update';
import ora, { type Ora } from 'ora';

import type { TerminalUIConfig } from './aTypes';

/**
 * Represents a live-updating section in the terminal.
 * @internal
 */
interface LiveSection {
    id: string;
    lines: string[];
}

/**ß
 * Terminal UI utilities for interactive output and live updates.
 *
 * Provides features like status lines, spinners, sections,
 * and cursor management for rich terminal experiences.
 */
export class TerminalUI {
    private readonly sections = new Map<string, LiveSection>();
    private readonly updater = logUpdate;
    private statusLine: string | null = null;
    private spinner: Ora | null = null;

    constructor(private readonly config: TerminalUIConfig = {}) {}

    /**
     * Clears the terminal screen.
     */
    public clear(): void {
        this.updater.clear();
        process.stdout.write(ansiEscapes.clearScreen);
    }

    /**
     * Sets or clears the persistent status line.
     *
     * @param text - Text to display, or null to clear
     */
    public setStatusLine(text: string | null): void {
        this.statusLine = text;
        this.render();
    }

    /**
     * Creates a new live-updating section.
     *
     * @param id - Unique identifier for the section
     */
    public createSection(id: string): void {
        if (!this.sections.has(id)) this.sections.set(id, { id, lines: [] });
    }

    /**
     * Updates content of an existing section.
     *
     * @param id - Section identifier
     * @param lines - New lines to display
     */
    public updateSection(id: string, lines: string[]): void {
        this.sections.set(id, { id, lines });
        this.render();
    }

    /**
     * Removes a section from display.
     *
     * @param id - Section identifier to remove
     */
    public removeSection(id: string): void {
        this.sections.delete(id);
        this.render();
    }

    /**
     * Moves the cursor by relative offset.
     *
     * @param x - Horizontal offset (columns)
     * @param y - Vertical offset (rows)
     */
    public moveCursor(x: number, y: number): void {
        process.stdout.write(ansiEscapes.cursorMove(x, y));
    }

    /**
     * Saves current cursor position.
     */
    public saveCursor(): void {
        process.stdout.write(ansiEscapes.cursorSavePosition);
    }

    /**
     * Restores previously saved cursor position.
     */
    public restoreCursor(): void {
        process.stdout.write(ansiEscapes.cursorRestorePosition);
    }

    /**
     * Clears the current line.
     */
    public clearLine(): void {
        process.stdout.write(ansiEscapes.eraseLine);
    }

    /**
     * Switches to alternate screen buffer.
     */
    public enterAlternateScreen(): void {
        if (!this.config.alternateScreen) return;
        process.stdout.write(ansiEscapes.enterAlternativeScreen);
    }

    /**
     * Returns to main screen buffer.
     */
    public exitAlternateScreen(): void {
        if (!this.config.alternateScreen) return;
        process.stdout.write(ansiEscapes.exitAlternativeScreen);
    }

    /**
     * Starts a loading spinner with text.
     *
     * @param text - Text to display next to spinner
     * @returns Ora spinner instance for advanced control
     */
    public startSpinner(text: string): Ora {
        this.spinner = ora({ text }).start();
        return this.spinner;
    }

    /**
     * Updates the text of the active spinner.
     *
     * @param text - New text to display
     */
    public updateSpinner(text: string): void {
        if (this.spinner) this.spinner.text = text;
    }

    /**
     * Stops the active spinner.
     *
     * @param finalText - Optional success message to display
     */
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
