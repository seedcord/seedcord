'use client';

import { useEffect } from 'react';

const HOTKEY = 'k';

export function useSearchHotkey(toggle: () => void): void {
    useEffect(() => {
        const handler = (event: KeyboardEvent): void => {
            if (event.key.toLowerCase() !== HOTKEY) return;
            // cmd or ctrl sets this chord apart from a typed "k"
            if (!(event.metaKey || event.ctrlKey)) return;

            event.preventDefault();
            toggle();
        };

        globalThis.addEventListener('keydown', handler);
        return () => globalThis.removeEventListener('keydown', handler);
    }, [toggle]);
}
