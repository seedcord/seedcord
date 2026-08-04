import { EventEmitter } from 'node:events';

import { render } from 'ink';

import type { ReactElement } from 'react';

// ink-testing-library hardcodes 100 columns and reads real rows from terminal-size, so size assertions render
// through here
class SizedStdout extends EventEmitter {
    private last = '';

    public constructor(
        public columns: number,
        public rows: number
    ) {
        super();
    }

    public readonly write = (frame: string): void => {
        this.last = frame;
    };

    public readonly lastFrame = (): string => this.last;

    public readonly resize = (size: { rows: number; columns: number }): void => {
        this.rows = size.rows;
        this.columns = size.columns;
        this.emit('resize');
    };
}

class StubStdin extends EventEmitter {
    public readonly isTTY = true;
    private pending: string | null = null;

    public setEncoding(): void {}
    public setRawMode(): void {}
    public resume(): void {}
    public pause(): void {}
    public ref(): void {}
    public unref(): void {}

    public read(): string | null {
        const { pending } = this;
        this.pending = null;
        return pending;
    }

    // ink reads through both paths depending on the terminal, so feed both
    public readonly send = (input: string): void => {
        this.pending = input;
        this.emit('readable');
        this.emit('data', input);
    };
}

export interface RenderAtResult {
    readonly lastFrame: () => string;
    readonly resize: (size: { rows: number; columns: number }) => void;
    readonly press: (input: string) => void;
    readonly unmount: () => void;
}

export function renderAt(tree: ReactElement, size: { rows: number; columns: number }): RenderAtResult {
    const stdout = new SizedStdout(size.columns, size.rows);
    const stdin = new StubStdin();

    const instance = render(tree, {
        // eslint-disable-next-line no-restricted-syntax -- ink's option types require net.Socket subtypes, and these stubs carry every member it reads
        stdout: stdout as unknown as NodeJS.WriteStream,
        // eslint-disable-next-line no-restricted-syntax -- same, for the stdin useInput attaches to
        stdin: stdin as unknown as NodeJS.ReadStream,
        debug: true,
        exitOnCtrlC: false,
        patchConsole: false
    });

    return {
        lastFrame: () => stdout.lastFrame(),
        resize: stdout.resize,
        press: stdin.send,
        unmount: () => {
            instance.unmount();
            instance.cleanup();
        }
    };
}
