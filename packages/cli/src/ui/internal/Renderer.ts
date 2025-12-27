import ansiEscapes from 'ansi-escapes';

export interface RenderSection {
    readonly id: string;
    readonly lines: readonly string[];
}

export interface RenderPayload {
    readonly sections: readonly RenderSection[];
    readonly statusLines: readonly string[];
}

export interface RenderSection {
    readonly id: string;
    readonly lines: readonly string[];
}

export interface RenderPayload {
    readonly sections: readonly RenderSection[];
    readonly statusLines: readonly string[];
}

export class Renderer {
    private cursorHidden = false;
    private renderedLines: string[] = [];

    public constructor(
        private readonly stream: NodeJS.WriteStream,
        private readonly rawWrite: (text: string) => void
    ) {}

    public enterAlternateScreen(): void {
        this.rawWrite(ansiEscapes.enterAlternativeScreen);
    }

    public exitAlternateScreen(): void {
        this.rawWrite(ansiEscapes.exitAlternativeScreen);
    }

    public hideCursor(): void {
        if (this.cursorHidden) return;
        this.cursorHidden = true;
        this.rawWrite(ansiEscapes.cursorHide);
    }

    public showCursor(): void {
        if (!this.cursorHidden) return;
        this.cursorHidden = false;
        this.rawWrite(ansiEscapes.cursorShow);
    }

    public moveCursor(x: number, y: number): void {
        this.rawWrite(ansiEscapes.cursorTo(x, y));
    }

    public clearRenderedRegion(): void {
        if (!this.stream.isTTY) {
            this.renderedLines = [];
            return;
        }

        if (this.renderedLines.length === 0) return;

        this.clearLines(0, this.renderedLines.length);
        this.moveCursorToBottom(0);
        this.renderedLines = [];
    }

    public render(payload: RenderPayload): void {
        const composed = this.composeLines(payload);

        if (!this.stream.isTTY) {
            if (composed.length) {
                this.rawWrite(`${composed.join('\n')}\n`);
            }
            this.renderedLines = [...composed];
            return;
        }

        const previous = this.renderedLines;
        const maxLength = Math.max(previous.length, composed.length);

        let rangeStart: number | null = null;

        for (let i = 0; i < maxLength; i += 1) {
            const nextLine = composed[i] ?? '';
            const lastLine = previous[i] ?? '';

            if (nextLine !== lastLine) {
                rangeStart ??= i;
            } else if (rangeStart !== null) {
                this.applyRange(rangeStart, i - 1, composed);
                rangeStart = null;
            }
        }

        if (rangeStart !== null) {
            this.applyRange(rangeStart, maxLength - 1, composed);
        }

        this.renderedLines = [...composed];
        this.moveCursorToBottom(composed.length);
    }

    public dispose(): void {
        this.showCursor();
        this.renderedLines = [];
    }

    private composeLines(payload: RenderPayload): string[] {
        const lines: string[] = [];
        for (const section of payload.sections) {
            lines.push(...section.lines);
        }
        lines.push(...payload.statusLines);
        return lines;
    }

    private applyRange(start: number, end: number, lines: readonly string[]): void {
        for (let i = start; i <= end; i += 1) {
            const target = lines[i];
            this.rawWrite(ansiEscapes.cursorTo(0, i));
            this.rawWrite(ansiEscapes.eraseLine);
            if (target !== undefined) {
                this.rawWrite(target);
            }
        }
    }

    private clearLines(start: number, count: number): void {
        for (let i = 0; i < count; i += 1) {
            this.rawWrite(ansiEscapes.cursorTo(0, start + i));
            this.rawWrite(ansiEscapes.eraseLine);
        }
    }

    private moveCursorToBottom(totalLines: number): void {
        this.rawWrite(ansiEscapes.cursorTo(0, totalLines));
    }
}
