import { PassThrough, Writable } from 'node:stream';

import headless from '@xterm/headless';

export interface Size {
    readonly rows: number;
    readonly columns: number;
}

// useInput throws unless stdin is a tty with setRawMode
export class KeyboardStdin extends PassThrough {
    public readonly isTTY = true;

    public setRawMode(): this {
        return this;
    }
}

// ink's debug mode writes each whole frame in one write
export class SizedStdout extends Writable {
    private last = '';

    public constructor(
        public columns: number,
        public rows: number
    ) {
        super();
    }

    public override _write(chunk: Buffer, _encoding: BufferEncoding, done: () => void): void {
        this.last = chunk.toString();
        done();
    }

    public lastFrame(): string {
        return this.last;
    }

    public resize(size: Size): void {
        this.rows = size.rows;
        this.columns = size.columns;
        this.emit('resize');
    }
}

export class ScreenStdout extends Writable {
    public readonly isTTY = true;
    private readonly terminal: headless.Terminal;

    public constructor(size: Size) {
        super();
        this.terminal = new headless.Terminal({
            cols: size.columns,
            rows: size.rows,
            allowProposedApi: true,
            // a tty driver turns \n into \r\n before the terminal sees it
            convertEol: true
        });
    }

    public get columns(): number {
        return this.terminal.cols;
    }

    public get rows(): number {
        return this.terminal.rows;
    }

    public override _write(chunk: Buffer, _encoding: BufferEncoding, done: () => void): void {
        this.terminal.write(chunk.toString(), done);
    }

    public async screen(): Promise<string> {
        // an empty write finishes after every chunk queued before it
        await new Promise<void>((resolve) => {
            this.write('', () => resolve());
        });
        const { active } = this.terminal.buffer;
        const rows = Array.from(
            { length: this.terminal.rows },
            (_, row) => active.getLine(row)?.translateToString(true) ?? ''
        );
        return rows.join('\n').trimEnd();
    }

    public resize(size: Size): void {
        this.terminal.resize(size.columns, size.rows);
        this.emit('resize');
    }

    public override _destroy(error: Error | null, done: (error: Error | null) => void): void {
        this.terminal.dispose();
        done(error);
    }
}
