'use client';

import { log } from './logger';

type Unregister = () => void;

const HOTKEY = 'k';

export function registerCommandPaletteHotkey(toggle: () => void): Unregister {
    const handler = (event: KeyboardEvent): void => {
        if (event.key.toLowerCase() !== HOTKEY) {
            return;
        }

        // no text-input guard needed, cmd or ctrl already sets this chord apart from a typed "k", so it
        // fires even while the palette's input has focus.
        if (!(event.metaKey || event.ctrlKey)) {
            return;
        }

        event.preventDefault();
        log('Command palette hotkey pressed', { platform: navigator.platform });
        toggle();
    };

    window.addEventListener('keydown', handler);
    log('Registered command palette hotkey listener');

    return () => {
        window.removeEventListener('keydown', handler);
        log('Unregistered command palette hotkey listener');
    };
}
