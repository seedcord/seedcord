import { KeyboardStdin, ScreenStdout } from '@seedcord/cli-prompts/testing';
import { render } from 'ink';

import type { Size } from '@seedcord/cli-prompts/testing';
import type { ReactElement } from 'react';

interface OnScreen extends Disposable {
    readonly screen: () => Promise<string>;
    readonly resize: (size: Size) => void;
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
        [Symbol.dispose]: () => {
            instance.unmount();
            instance.cleanup();
            stdout.destroy();
        }
    };
}
