import ansiEscapes from 'ansi-escapes';

import { countVisualLines } from './utils';

export class Renderer {
    private lastVisualLines = 0;
    private cursorHidden = false;

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

    public clearRenderedRegion(): void {
        if (this.lastVisualLines <= 0) return;
        this.rawWrite(ansiEscapes.cursorUp(this.lastVisualLines));
        this.rawWrite(ansiEscapes.eraseDown);
        this.lastVisualLines = 0;
    }

    public render(text: string): void {
        this.clearRenderedRegion();

        if (!text) {
            this.lastVisualLines = 0;
            return;
        }

        this.rawWrite(text);
        this.rawWrite('\n');

        const columns = this.stream.columns;
        this.lastVisualLines = countVisualLines(text, columns) + 1;
    }

    public dispose(): void {
        this.clearRenderedRegion();
        this.showCursor();
    }
}
