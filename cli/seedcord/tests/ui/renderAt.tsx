import { render } from 'ink';

import { KeyboardStdin, SizedStdout } from './terminalStubs';

import type { Size } from './terminalStubs';
import type { ReactElement } from 'react';

export interface RenderAtResult {
    readonly lastFrame: () => string;
    readonly resize: (size: Size) => void;
    readonly press: (input: string) => void;
    readonly unmount: () => void;
}

// ink-testing-library hardcodes 100 columns and reads real rows from terminal-size, so size assertions render
// through here
export function renderAt(tree: ReactElement, size: Size): RenderAtResult {
    const stdout = new SizedStdout(size.columns, size.rows);
    const stdin = new KeyboardStdin();

    const instance = render(tree, { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false });

    return {
        lastFrame: () => stdout.lastFrame(),
        resize: (next) => stdout.resize(next),
        press: (input) => stdin.write(input),
        unmount: () => {
            instance.unmount();
            instance.cleanup();
        }
    };
}
