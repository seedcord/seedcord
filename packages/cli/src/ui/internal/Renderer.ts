import ansiEscapes from 'ansi-escapes';
import { createLogUpdate } from 'log-update';

import type logUpdate from 'log-update';

export class Renderer {
    private cursorHidden = false;
    private readonly logUpdate: typeof logUpdate;

    public constructor(
        stream: NodeJS.WriteStream,
        private readonly rawWrite: (text: string) => void
    ) {
        this.logUpdate = createLogUpdate(stream, { showCursor: false });
    }

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
        this.logUpdate.clear();
    }

    public render(text: string): void {
        if (!text) {
            this.logUpdate.clear();
            return;
        }

        this.logUpdate(text);
    }

    public dispose(): void {
        this.logUpdate.done();
        this.showCursor();
    }
}
