'use client';

import { log } from './logger';

type Unregister = () => void;

type OpenPalette = (nextOpen: boolean) => void;

const HOTKEY = 'k';

function isTextInput(element: Element | null): boolean {
    if (!element) {
        return false;
    }

    const tagName = element.tagName.toLowerCase();

    return tagName === 'input' || tagName === 'textarea' || element.hasAttribute('contenteditable');
}

export function registerCommandPaletteHotkey(update: OpenPalette): Unregister {
    const handler = (event: KeyboardEvent): void => {
        if (event.key.toLowerCase() !== HOTKEY) {
            return;
        }

        if (!(event.metaKey || event.ctrlKey)) {
            return;
        }

        if (isTextInput(event.target as Element)) {
            return;
        }

        event.preventDefault();
        log('Command palette hotkey pressed', { platform: navigator.platform });
        update(true);
    };

    window.addEventListener('keydown', handler);
    log('Registered command palette hotkey listener');

    return () => {
        window.removeEventListener('keydown', handler);
        log('Unregistered command palette hotkey listener');
    };
}
