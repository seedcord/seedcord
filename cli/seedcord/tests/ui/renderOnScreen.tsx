import { render } from 'ink';

import { KeyboardStdin, ScreenStdout } from './terminalStubs';

import type { Size } from './terminalStubs';
import type { ReactElement } from 'react';

export interface OnScreen {
    readonly screen: () => Promise<string>;
    readonly resize: (size: Size) => void;
    readonly unmount: () => void;
}

// renders in ink's interactive alternate-screen mode, the way `seedcord dev` does
export function renderOnScreen(tree: ReactElement, size: Size): OnScreen {
    const stdout = new ScreenStdout(size);
    const instance = render(tree, {
        stdout,
        stdin: new KeyboardStdin(),
        interactive: true,
        alternateScreen: true,
        exitOnCtrlC: false,
        patchConsole: false
    });

    return {
        screen: () => stdout.screen(),
        resize: (next) => stdout.resize(next),
        unmount: () => {
            instance.unmount();
            instance.cleanup();
            stdout.destroy();
        }
    };
}
